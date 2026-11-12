begin;
set local lock_timeout = '5s';

create table cali_workspace.partner_material_reviews (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('report','proposal','mapa')),
  entity_id uuid not null,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  context text not null,
  source_version text not null,
  draft_text text,
  status text not null default 'assigned' check (status in ('assigned','pending','returned','accepted')),
  revision integer not null default 1,
  decision_note text,
  updated_at timestamptz not null default now(),
  unique(kind,entity_id)
);
alter table cali_workspace.partner_material_reviews enable row level security;
revoke all on cali_workspace.partner_material_reviews from public,anon,authenticated;
grant select on cali_workspace.partner_material_reviews to authenticated;

create function cali_workspace.material_review_module(p_kind text)
returns text language sql immutable set search_path = '' as $$
  select case p_kind when 'report' then 'reports' when 'proposal' then 'proposals' when 'mapa' then 'people_map' end;
$$;
revoke all on function cali_workspace.material_review_module(text) from public,anon;
grant execute on function cali_workspace.material_review_module(text) to authenticated;

create policy partner_material_review_read on cali_workspace.partner_material_reviews
for select to authenticated using (
  (select cali_workspace.workspace_private_access_v2()) and (
    (select cali_workspace.is_admin()) or (
      author_id = (select auth.uid())
      and cali_workspace.partner_can_access(company_id,cali_workspace.material_review_module(kind))
    )
  )
);

create function cali_workspace.assign_partner_material_review(
  p_kind text,p_entity_id uuid,p_company_id uuid,p_author_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_context text;
  v_version text;
  v_id uuid;
  v_module text := cali_workspace.material_review_module(p_kind);
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501',message='Atribuição restrita à administradora.';
  end if;
  perform 1 from cali_workspace.staff_members s
  join cali_workspace.staff_company_assignments a on a.staff_id = s.id
  join cali_workspace.companies c on c.id = a.company_id
  join cali_workspace.profiles p on p.id = s.user_id
  where a.company_id = p_company_id and s.user_id = p_author_id and s.active and p.active and p.role = 'partner'
    and v_module = any(s.modules) and c.status in ('active','paused')
  for share of s,a,c,p;
  if not found then raise exception using errcode='42501',message='Partner indisponível nesta empresa ou módulo.'; end if;

  case p_kind
  when 'report' then
    select title,coalesce(executive_summary,''),extract(epoch from updated_at)::text into v_title,v_context,v_version
    from cali_workspace.reports where id=p_entity_id and company_id=p_company_id and status in ('draft','review');
  when 'proposal' then
    select 'Proposta '||s.protocol||' · v'||p.version,coalesce(p.public_notes,''),extract(epoch from p.updated_at)::text into v_title,v_context,v_version
    from public.cali_proposals p join public.cali_submissions s on s.id=p.submission_id
    where p.id=p_entity_id and p.status='rascunho' and s.archived_at is null;
  when 'mapa' then
    select 'Devolutiva '||protocolo,coalesce(observacoes->>'parecer',''),md5(observacoes::text)
    into v_title,v_context,v_version from public.mapa_respostas where id=p_entity_id and lgpd_aceite and status <> 'enviado';
  else null;
  end case;
  if v_version is null then raise exception using errcode='22023',message='Material indisponível para atribuição.'; end if;

  insert into cali_workspace.partner_material_reviews as r(kind,entity_id,company_id,author_id,title,context,source_version)
  values (p_kind,p_entity_id,p_company_id,p_author_id,v_title,left(v_context,12000),v_version)
  on conflict (kind,entity_id) do update set
    company_id=excluded.company_id,author_id=excluded.author_id,title=excluded.title,context=excluded.context,
    source_version=excluded.source_version,draft_text=null,status='assigned',revision=r.revision+1,decision_note=null,updated_at=now()
  where r.status <> 'pending'
  returning id into v_id;
  if v_id is null then raise exception using errcode='40001',message='Decida a revisão pendente antes de alterar a atribuição.'; end if;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,entity_type,entity_id,action_url)
  values(p_company_id,p_author_id,'staff_material_assigned','Material atribuído','material_review',v_id,'/equipe/materiais');
  return v_id;
end;
$$;

create function cali_workspace.submit_partner_material_review(p_id uuid,p_revision integer,p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_review cali_workspace.partner_material_reviews%rowtype;
  v_text text := btrim(coalesce(p_text,''));
begin
  if cali_workspace.workspace_private_access_v2() is not true or length(v_text) not between 5 and 12000 then
    raise exception using errcode='42501',message='Preencha o material com seu acesso de Partner.';
  end if;
  select * into v_review from cali_workspace.partner_material_reviews r
  where r.id=p_id and r.author_id=auth.uid() and cali_workspace.partner_can_access(r.company_id,cali_workspace.material_review_module(r.kind))
  for update;
  if not found or v_review.revision is distinct from p_revision then
    raise exception using errcode='40001',message='A atribuição mudou. Atualize o material.';
  end if;
  if v_review.status = 'pending' and v_review.draft_text = v_text then return; end if;
  if v_review.status not in ('assigned','returned') then
    raise exception using errcode='40001',message='Esta revisão já foi encaminhada.';
  end if;
  update cali_workspace.partner_material_reviews set draft_text=v_text,status='pending',updated_at=now() where id=p_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,entity_type,entity_id,action_url)
  select v_review.company_id,p.id,'staff_material_review','Material para revisar','material_review',p_id,
    case v_review.kind
      when 'report' then '/admin/relatorios?report='||v_review.entity_id
      when 'proposal' then '/admin/propostas/proposta/'||v_review.entity_id
      else '/admin/mapa-de-people/revisao?protocolo='||(select protocolo from public.mapa_respostas where id=v_review.entity_id) end
  from cali_workspace.profiles p where p.role='admin' and p.active;
end;
$$;

create function cali_workspace.decide_partner_material_review(p_id uuid,p_revision integer,p_accept boolean,p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_review cali_workspace.partner_material_reviews%rowtype;
  v_note text := nullif(btrim(p_note),'');
  v_changed boolean;
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501',message='Revisão restrita à administradora.';
  end if;
  if p_accept is null or (not p_accept and coalesce(length(v_note),0) not between 3 and 2000) then
    raise exception using errcode='22023',message='Informe o ajuste solicitado.';
  end if;
  select * into v_review from cali_workspace.partner_material_reviews where id=p_id for update;
  if not found or v_review.revision is distinct from p_revision then
    raise exception using errcode='40001',message='A revisão mudou. Atualize o material.';
  end if;
  if v_review.status = 'accepted' and p_accept then return; end if;
  if v_review.status <> 'pending' then raise exception using errcode='40001',message='Não há revisão pendente.'; end if;

  if p_accept then
    perform 1 from cali_workspace.staff_members s
    join cali_workspace.staff_company_assignments a on a.staff_id=s.id
    join cali_workspace.profiles p on p.id=s.user_id
    join cali_workspace.companies c on c.id=a.company_id
    where s.user_id=v_review.author_id and a.company_id=v_review.company_id and s.active
      and p.active and p.role='partner' and c.status in ('active','paused')
      and cali_workspace.material_review_module(v_review.kind)=any(s.modules)
    for share of s,a,p,c;
    if not found then raise exception using errcode='42501',message='A atribuição mudou. Devolva o material para ajuste.'; end if;
    case v_review.kind
    when 'report' then
      update cali_workspace.reports set executive_summary=v_review.draft_text
      where id=v_review.entity_id and company_id=v_review.company_id and status in ('draft','review') and extract(epoch from updated_at)::text=v_review.source_version;
      v_changed := found;
    when 'proposal' then
      update public.cali_proposals set public_notes=v_review.draft_text,updated_at=now()
      where id=v_review.entity_id and status='rascunho' and extract(epoch from updated_at)::text=v_review.source_version;
      v_changed := found;
    when 'mapa' then
      update public.mapa_respostas set observacoes=jsonb_set(coalesce(observacoes,'{}'::jsonb),'{parecer}',to_jsonb(v_review.draft_text),true)
      where id=v_review.entity_id and status <> 'enviado' and md5(observacoes::text)=v_review.source_version;
      v_changed := found;
    end case;
    if not v_changed then
      raise exception using errcode='40001',message='O material-base mudou. Devolva para ajuste e revise a atribuição.';
    end if;
  end if;
  update cali_workspace.partner_material_reviews
  set status=case when p_accept then 'accepted' else 'returned' end,
      revision=case when p_accept then revision else revision+1 end,decision_note=v_note,updated_at=now()
  where id=p_id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_review.company_id,auth.uid(),case when p_accept then 'partner_material_accepted' else 'partner_material_returned' end,
    v_review.kind,v_review.entity_id,jsonb_build_object('review_id',p_id,'revision',p_revision));
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,entity_type,entity_id,action_url)
  select v_review.company_id,p.id,'staff_material_decision',
    case when p_accept then 'Material aprovado' else 'Material devolvido para ajuste' end,
    'material_review',p_id,'/equipe/materiais' from cali_workspace.profiles p where p.id=v_review.author_id and p.active;
end;
$$;

revoke all on function cali_workspace.assign_partner_material_review(text,uuid,uuid,uuid),
  cali_workspace.submit_partner_material_review(uuid,integer,text),
  cali_workspace.decide_partner_material_review(uuid,integer,boolean,text) from public,anon;
grant execute on function cali_workspace.assign_partner_material_review(text,uuid,uuid,uuid),
  cali_workspace.submit_partner_material_review(uuid,integer,text),
  cali_workspace.decide_partner_material_review(uuid,integer,boolean,text) to authenticated;
notify pgrst, 'reload schema';
commit;
