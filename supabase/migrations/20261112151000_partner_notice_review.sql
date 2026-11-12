begin;
set local lock_timeout = '5s';

create table cali_workspace.partner_notice_reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  revision integer not null default 1,
  category text not null check (category in ('feriado','atendimento','comunicado')),
  title text not null check (length(title) between 1 and 180),
  body text not null check (length(body) between 1 and 5000),
  company_ids uuid[] not null check (cardinality(company_ids) between 1 and 40),
  notice_date date,
  time_label text,
  coverage text,
  status text not null default 'pending' check (status in ('pending','returned','published')),
  review_note text,
  reviewed_at timestamptz,
  notice_id uuid references cali_workspace.notices(id) on delete set null,
  submitted_at timestamptz not null default now()
);
alter table cali_workspace.partner_notice_reviews enable row level security;
revoke all on cali_workspace.partner_notice_reviews from public, anon, authenticated;
grant select on cali_workspace.partner_notice_reviews to authenticated;
create policy partner_notice_reviews_visible on cali_workspace.partner_notice_reviews
for select to authenticated using (
  (select cali_workspace.workspace_private_access_v2()) and (
    (select cali_workspace.is_admin()) or (
      author_id = (select auth.uid()) and (select cali_workspace.partner_has_module('notices'))
      and not exists (
        select 1 from unnest(company_ids) company where not cali_workspace.partner_can_access(company, 'notices')
      )
    )
  )
);

create table cali_workspace.partner_notice_review_receipts (
  author_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  review_id uuid not null references cali_workspace.partner_notice_reviews(id) on delete cascade,
  content_hash text not null,
  primary key (author_id, request_id)
);
alter table cali_workspace.partner_notice_review_receipts enable row level security;
revoke all on cali_workspace.partner_notice_review_receipts from public, anon, authenticated;

create or replace function cali_workspace.submit_partner_notice_review(
  p_request_id uuid, p_review_id uuid, p_revision integer,
  p_category text, p_title text, p_body text, p_companies uuid[], p_date date,
  p_time text default null, p_coverage text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_companies uuid[];
  v_review cali_workspace.partner_notice_reviews%rowtype;
  v_existing cali_workspace.partner_notice_review_receipts%rowtype;
  v_hash text;
begin
  if cali_workspace.workspace_private_access_v2() is not true
    or cali_workspace.partner_has_module('notices') is not true then
    raise exception using errcode = '42501', message = 'Módulo Avisos indisponível para este acesso.';
  end if;
  if p_request_id is null or p_category is null or p_category not in ('feriado','atendimento','comunicado')
    or coalesce(length(btrim(p_title)),0) not between 1 and 180
    or coalesce(length(btrim(p_body)),0) not between 1 and 5000
    or coalesce(cardinality(p_companies),0) not between 1 and 40 then
    raise exception using errcode = '22023', message = 'Preencha o comunicado e escolha as empresas.';
  end if;
  select array_agg(distinct c order by c) into v_companies from unnest(p_companies) c;
  if array_position(v_companies,null) is not null or exists (
    select 1 from unnest(v_companies) company_id
    where cali_workspace.partner_can_access(company_id, 'notices') is not true
      or not exists (select 1 from cali_workspace.companies c where c.id = company_id and c.status in ('active','paused'))
  ) then
    raise exception using errcode = '42501', message = 'Uma das empresas está fora da sua atribuição.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':notice:' || p_request_id::text,0));
  v_hash := encode(extensions.digest(jsonb_build_array(
    p_review_id,p_revision,p_category,btrim(p_title),btrim(p_body),v_companies,p_date,btrim(p_time),btrim(p_coverage)
  )::text,'sha256'),'hex');
  select * into v_existing from cali_workspace.partner_notice_review_receipts
  where author_id = v_user and request_id = p_request_id;
  if found then
    if v_existing.content_hash is distinct from v_hash then
      raise exception using errcode = '40001', message = 'A confirmação do comunicado mudou.';
    end if;
    return v_existing.review_id;
  end if;

  if p_review_id is null then
    insert into cali_workspace.partner_notice_reviews(category,title,body,company_ids,notice_date,time_label,coverage)
    values (p_category,btrim(p_title),btrim(p_body),v_companies,p_date,left(nullif(btrim(p_time),''),100),left(nullif(btrim(p_coverage),''),100))
    returning * into v_review;
  else
    update cali_workspace.partner_notice_reviews
    set revision = revision + 1, category = p_category, title = btrim(p_title), body = btrim(p_body),
      company_ids = v_companies, notice_date = p_date, time_label = left(nullif(btrim(p_time),''),100),
      coverage = left(nullif(btrim(p_coverage),''),100), status = 'pending', review_note = null,
      reviewed_at = null, submitted_at = clock_timestamp()
    where id = p_review_id and author_id = v_user and status = 'returned' and revision = p_revision
    returning * into v_review;
    if not found then raise exception using errcode = '40001', message = 'O comunicado mudou. Atualize a fila.'; end if;
  end if;
  insert into cali_workspace.partner_notice_review_receipts(author_id,request_id,review_id,content_hash)
  values(v_user,p_request_id,v_review.id,v_hash);
  insert into cali_workspace.notifications(user_id,notification_type,title,body,entity_type,entity_id,action_url,email_required)
  select p.id,'staff_notice_review','Comunicado para revisar',v_review.title,'notice_review',v_review.id,'/admin/avisos',false
  from cali_workspace.profiles p where p.active and p.role = 'admin';
  return v_review.id;
end;
$$;

-- Keep the original endpoint compatible with older clients, with the review gate enforced.
create or replace function cali_workspace.partner_publish_notice(
  p_category text, p_title text, p_body text, p_companies uuid[], p_date date default null,
  p_time text default null, p_coverage text default null
) returns uuid language sql security invoker set search_path = '' as $$
  select cali_workspace.submit_partner_notice_review(
    gen_random_uuid(),null,null,p_category,p_title,p_body,p_companies,p_date,p_time,p_coverage);
$$;

create or replace function cali_workspace.review_partner_notice(
  p_review_id uuid, p_revision integer, p_approve boolean, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_review cali_workspace.partner_notice_reviews%rowtype;
  v_notice uuid;
  v_note text := nullif(btrim(p_note),'');
  v_company_id uuid;
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode = '42501', message = 'Apenas a administradora pode revisar avisos.';
  end if;
  if p_approve is null or (not p_approve and coalesce(length(v_note),0) not between 3 and 2000) then
    raise exception using errcode = '22023', message = 'Informe o ajuste solicitado.';
  end if;
  select * into v_review from cali_workspace.partner_notice_reviews where id = p_review_id for update;
  if not found or v_review.revision is distinct from p_revision then
    raise exception using errcode = '40001', message = 'O comunicado mudou. Atualize a fila.';
  end if;
  if v_review.status = 'published' and p_approve then return v_review.notice_id; end if;
  if v_review.status = 'returned' and not p_approve then return null; end if;
  if v_review.status <> 'pending' then
    raise exception using errcode = '40001', message = 'A revisão já foi decidida.';
  end if;

  if p_approve then
    foreach v_company_id in array v_review.company_ids loop
      perform 1
      from cali_workspace.staff_company_assignments a
      join cali_workspace.staff_members s on s.id = a.staff_id
      join cali_workspace.profiles p on p.id = s.user_id
      join cali_workspace.companies c on c.id = a.company_id
      where a.company_id = v_company_id and s.user_id = v_review.author_id and s.active and 'notices' = any(s.modules)
        and p.active and p.role = 'partner' and c.status in ('active','paused')
      for share of a,s,p,c;
      if not found then
        raise exception using errcode = '42501', message = 'A atribuição mudou. Devolva o comunicado para ajuste.';
      end if;
    end loop;
    insert into cali_workspace.notices(category,title,body,notice_date,time_label,coverage,audience,status,created_by)
    values (v_review.category,v_review.title,v_review.body,v_review.notice_date,v_review.time_label,v_review.coverage,
      'selected','published',auth.uid())
    returning id into v_notice;
    insert into cali_workspace.notice_targets(notice_id,company_id) select v_notice, unnest(v_review.company_ids);
    perform cali_workspace.notify_notice(v_notice);
  end if;
  update cali_workspace.partner_notice_reviews
  set status = case when p_approve then 'published' else 'returned' end,
      review_note = v_note, reviewed_at = clock_timestamp(), notice_id = v_notice
  where id = p_review_id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  select company,auth.uid(),case when p_approve then 'partner_notice_approved' else 'partner_notice_returned' end,
    'notice_review',p_review_id,jsonb_build_object('revision',p_revision,'notice_id',v_notice)
  from unnest(v_review.company_ids) company;
  insert into cali_workspace.notifications(user_id,notification_type,title,body,entity_type,entity_id,action_url,email_required)
  select p.id,'staff_notice_decision',case when p_approve then 'Comunicado aprovado' else 'Comunicado devolvido para ajuste' end,
    v_review.title,'notice_review',p_review_id,'/equipe/avisos',false
  from cali_workspace.profiles p where p.id = v_review.author_id and p.active;
  return v_notice;
end;
$$;

revoke all on function cali_workspace.submit_partner_notice_review(uuid,uuid,integer,text,text,text,uuid[],date,text,text),
  cali_workspace.review_partner_notice(uuid,integer,boolean,text) from public, anon;
grant execute on function cali_workspace.submit_partner_notice_review(uuid,uuid,integer,text,text,text,uuid[],date,text,text),
  cali_workspace.review_partner_notice(uuid,integer,boolean,text) to authenticated;

notify pgrst, 'reload schema';
commit;
