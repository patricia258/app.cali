-- Perfil Comportamental CALI — assinatura, protocolo e entrega (pedido da proprietária, 23/10/2026).
-- Regra: todo relatório leva a assinatura virtual e a foto da responsável técnica e um número de protocolo rastreável.
-- 1) Responsável técnica configurável (padrão: Patrícia Lima); identidade pública só com nome, cargo, foto e assinatura.
-- 2) Protocolo CALI-PERFIL-AAAA-NNNNNN em cada resultado (respondente e avaliador usam o mesmo).
-- 3) Relatório de gestão: parecer da CALI (obrigatório), aprovação com protocolo CALI-GESTAO e assinatura congelada,
--    liberação no aplicativo (avisa por e-mail quem tem conta na empresa) e envio do PDF ao gestor por e-mail.
--    Cada passo fica no activity_log (auditoria).

create table if not exists cali_workspace.profile_report_settings (
  id boolean primary key default true check (id),
  signer_user_id uuid references cali_workspace.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table cali_workspace.profile_report_settings enable row level security;
drop policy if exists profile_report_settings_admin on cali_workspace.profile_report_settings;
create policy profile_report_settings_admin on cali_workspace.profile_report_settings for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
grant select, insert, update on cali_workspace.profile_report_settings to authenticated;
insert into cali_workspace.profile_report_settings (id, signer_user_id)
select true, id from cali_workspace.profiles where lower(email) = 'patricia@calirh.com' limit 1
on conflict (id) do nothing;

create or replace function cali_workspace.profile_signer_snapshot()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('full_name', p.full_name, 'job_title', p.job_title, 'avatar_url', p.avatar_url,
           'avatar_position_x', p.avatar_position_x, 'avatar_position_y', p.avatar_position_y, 'avatar_zoom', p.avatar_zoom,
           'signature_mode', p.signature_mode, 'signature_url', p.signature_url, 'signature_style', p.signature_style)
    from cali_workspace.profile_report_settings s join cali_workspace.profiles p on p.id = s.signer_user_id where s.id;
$$;
revoke all on function cali_workspace.profile_signer_snapshot() from public, anon;

-- Público: identidade da responsável técnica (só campos de apresentação), para o PDF gerado no navegador da pessoa.
create or replace function public.cali_profile_signer()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select cali_workspace.profile_signer_snapshot();
$$;
revoke all on function public.cali_profile_signer() from public;
grant execute on function public.cali_profile_signer() to anon, authenticated;

-- Protocolo em cada resultado.
alter table cali_workspace.profile_results add column if not exists protocol text;
create unique index if not exists profile_results_protocol_key on cali_workspace.profile_results (protocol);
create or replace function cali_workspace.profile_results_protocol()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
begin
  if new.protocol is null then new.protocol := cali_workspace.generate_protocol('PERFIL'); end if;
  return new;
end $$;
drop trigger if exists profile_results_protocol on cali_workspace.profile_results;
create trigger profile_results_protocol before insert on cali_workspace.profile_results for each row execute function cali_workspace.profile_results_protocol();
do $$ declare r record; begin
  for r in select id from cali_workspace.profile_results where protocol is null order by created_at loop
    update cali_workspace.profile_results set protocol = cali_workspace.generate_protocol('PERFIL') where id = r.id;
  end loop;
end $$;

create or replace function public.cali_profile_report(p_token uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select jsonb_build_object('id', r.id, 'person_name', r.person_name, 'company_name', coalesce(c.display_name, r.company_name),
         'job_title', r.job_title, 'created_at', r.created_at, 'scores', r.scores, 'primary_style', r.primary_style,
         'secondary_style', r.secondary_style, 'mixed', r.mixed, 'method_version', r.method_version, 'has_pdf', r.report_path is not null,
         'protocol', r.protocol)
    from cali_workspace.profile_results r left join cali_workspace.companies c on c.id = r.company_id
   where r.access_token = p_token;
$$;
revoke all on function public.cali_profile_report(uuid) from public;
grant execute on function public.cali_profile_report(uuid) to anon, authenticated;

-- Relatório de gestão: parecer, aprovação, liberação e envio.
alter table cali_workspace.profile_links
  add column if not exists gestao_note text,
  add column if not exists gestao_protocol text,
  add column if not exists gestao_approved_at timestamptz,
  add column if not exists gestao_approved_by uuid,
  add column if not exists gestao_signer jsonb,
  add column if not exists gestao_sent_log jsonb not null default '[]'::jsonb;
alter table cali_workspace.profile_links drop constraint if exists profile_links_gestao_note_len;
alter table cali_workspace.profile_links add constraint profile_links_gestao_note_len check (gestao_note is null or length(gestao_note) <= 700);

create or replace function cali_workspace.profile_gestao_approve(p_link uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_link cali_workspace.profile_links%rowtype; v_n integer; v_protocol text;
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_link from cali_workspace.profile_links where id = p_link for update;
  if not found then raise exception 'Link não encontrado.'; end if;
  if not p_approve then
    update cali_workspace.profile_links set gestao_approved_at = null, gestao_approved_by = null, gestao_released_at = null where id = p_link;
    insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
    values (v_link.company_id, auth.uid(), 'profile_gestao_reopened', 'profile_link', p_link, jsonb_build_object('protocol', v_link.gestao_protocol));
    return jsonb_build_object('ok', true);
  end if;
  select count(*) into v_n from (select distinct lower(email) from cali_workspace.profile_results where link_id = p_link) x;
  if v_n < 5 then raise exception 'O relatório de gestão precisa de pelo menos 5 respostas.'; end if;
  if length(btrim(coalesce(v_link.gestao_goal, ''))) < 3 then raise exception 'Preencha o resultado que a empresa persegue.'; end if;
  if length(btrim(coalesce(v_link.gestao_note, ''))) < 20 then raise exception 'Escreva o parecer da CALI antes de aprovar.'; end if;
  v_protocol := cali_workspace.generate_protocol('GESTAO');
  update cali_workspace.profile_links
     set gestao_protocol = v_protocol, gestao_approved_at = now(), gestao_approved_by = auth.uid(), gestao_signer = cali_workspace.profile_signer_snapshot()
   where id = p_link;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_link.company_id, auth.uid(), 'profile_gestao_approved', 'profile_link', p_link, jsonb_build_object('protocol', v_protocol, 'respostas', v_n));
  return jsonb_build_object('ok', true, 'protocol', v_protocol);
end $$;
revoke all on function cali_workspace.profile_gestao_approve(uuid, boolean) from public, anon;
grant execute on function cali_workspace.profile_gestao_approve(uuid, boolean) to authenticated;

-- Edição do conteúdo depois da aprovação desfaz a aprovação (o protocolo aprovado não pode mudar de conteúdo).
create or replace function cali_workspace.profile_links_gestao_guard()
returns trigger language plpgsql set search_path to 'pg_catalog', 'cali_workspace' as $$
begin
  if old.gestao_approved_at is not null and (new.gestao_note is distinct from old.gestao_note or new.gestao_goal is distinct from old.gestao_goal
     or new.gestao_moment is distinct from old.gestao_moment or new.gestao_sector is distinct from old.gestao_sector) then
    new.gestao_approved_at := null; new.gestao_approved_by := null; new.gestao_released_at := null;
  end if;
  if new.gestao_released_at is not null and new.gestao_approved_at is null then
    raise exception 'Aprove o relatório de gestão antes de liberar.';
  end if;
  return new;
end $$;
drop trigger if exists profile_links_gestao_guard on cali_workspace.profile_links;
create trigger profile_links_gestao_guard before update on cali_workspace.profile_links for each row execute function cali_workspace.profile_links_gestao_guard();

create or replace function cali_workspace.profile_gestao_release(p_link uuid, p_release boolean)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_link cali_workspace.profile_links%rowtype; v_users integer;
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_link from cali_workspace.profile_links where id = p_link for update;
  if not found then raise exception 'Link não encontrado.'; end if;
  if p_release and v_link.gestao_approved_at is null then raise exception 'Aprove o relatório antes de liberar.'; end if;
  if p_release and v_link.company_id is null then raise exception 'Esta empresa não tem conta no aplicativo: envie o PDF ao gestor.'; end if;
  update cali_workspace.profile_links set gestao_released_at = case when p_release then now() else null end where id = p_link;
  select count(*) into v_users from cali_workspace.profiles where company_id = v_link.company_id and role = 'client' and coalesce(active, true);
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_link.company_id, auth.uid(), case when p_release then 'profile_gestao_released' else 'profile_gestao_withdrawn' end, 'profile_link', p_link,
          jsonb_build_object('protocol', v_link.gestao_protocol, 'usuarios_avisados', case when p_release then v_users else 0 end));
  if p_release then perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'gestao_released', 'link_id', p_link)); end if;
  return jsonb_build_object('ok', true, 'notified', case when p_release then v_users else 0 end);
end $$;
revoke all on function cali_workspace.profile_gestao_release(uuid, boolean) from public, anon;
grant execute on function cali_workspace.profile_gestao_release(uuid, boolean) to authenticated;

create or replace function cali_workspace.profile_gestao_send(p_link uuid, p_name text, p_email text, p_path text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_link cali_workspace.profile_links%rowtype; v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_link from cali_workspace.profile_links where id = p_link for update;
  if not found then raise exception 'Link não encontrado.'; end if;
  if v_link.gestao_approved_at is null then raise exception 'Aprove o relatório antes de enviar.'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Confira o e-mail do gestor.'; end if;
  if p_path is null or p_path not like 'gestao/' || p_link::text || '/%' then raise exception 'Arquivo inválido.'; end if;
  update cali_workspace.profile_links
     set gestao_sent_log = gestao_sent_log || jsonb_build_array(jsonb_build_object('at', now(), 'by', auth.uid(), 'name', btrim(coalesce(p_name, '')), 'email', v_email, 'protocol', v_link.gestao_protocol, 'path', p_path))
   where id = p_link;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_link.company_id, auth.uid(), 'profile_gestao_sent', 'profile_link', p_link, jsonb_build_object('protocol', v_link.gestao_protocol, 'para', v_email));
  perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'gestao_pdf', 'link_id', p_link, 'name', btrim(coalesce(p_name, '')), 'email', v_email, 'path', p_path));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function cali_workspace.profile_gestao_send(uuid, text, text, text) from public, anon;
grant execute on function cali_workspace.profile_gestao_send(uuid, text, text, text) to authenticated;

-- PDF do relatório de gestão: a administradora grava em cali-profiles/gestao/<link>/...
drop policy if exists cali_profiles_admin_gestao_insert on storage.objects;
create policy cali_profiles_admin_gestao_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cali-profiles' and name like 'gestao/%' and cali_workspace.is_admin());

-- Leitura agregada: agora com parecer, protocolo, assinatura congelada e histórico de envios (só para a administradora).
create or replace function cali_workspace.profile_gestao(p_link uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_link cali_workspace.profile_links%rowtype; v_company text; v_meta jsonb; v_inv jsonb; v_dist jsonb; v_n integer; v_admin boolean := cali_workspace.is_admin(); v_account boolean;
begin
  select * into v_link from cali_workspace.profile_links where id = p_link;
  if not found then return null; end if;
  if not (v_admin or (v_link.gestao_released_at is not null and v_link.company_id is not null and v_link.company_id = cali_workspace.current_company_id())) then
    return null;
  end if;
  select display_name into v_company from cali_workspace.companies where id = v_link.company_id;
  select exists (select 1 from cali_workspace.profiles where company_id = v_link.company_id and role = 'client') into v_account;
  select count(*) into v_n from (select distinct lower(email) from cali_workspace.profile_results where link_id = p_link) x;
  select jsonb_build_object(
           'sent', count(*) filter (where sent_at is not null),
           'completed', count(*) filter (where completed_at is not null),
           'declined', count(*) filter (where declined_at is not null and completed_at is null),
           'started', count(*) filter (where started_at is not null),
           'expired', count(*) filter (where sent_at is not null and completed_at is null and declined_at is null and deadline_at < now()),
           'median_minutes', percentile_cont(0.5) within group (order by extract(epoch from (completed_at - started_at)) / 60) filter (where completed_at is not null and started_at is not null))
    into v_inv from cali_workspace.profile_invites where link_id = p_link;
  select jsonb_build_object('min', min(created_at), 'max', max(created_at), 'method', max(method_version))
    into v_meta from cali_workspace.profile_results where link_id = p_link;
  if v_n >= 5 then
    with latest as (
      select distinct on (lower(email)) * from cali_workspace.profile_results where link_id = p_link order by lower(email), created_at desc
    ), styles(s) as (values ('D'), ('I'), ('S'), ('C')),
    changes as (
      select l.id, count(*) filter (where abs((l.scores->'adaptation'->>st.s)::int) >= 25) as changed
        from latest l cross join styles st group by l.id
    )
    select jsonb_build_object(
      'primary', (select jsonb_object_agg(st.s, (select count(*) from latest where primary_style = st.s)) from styles st),
      'secondary', (select jsonb_object_agg(st.s, (select count(*) from latest where secondary_style = st.s)) from styles st),
      'mixed', (select count(*) from latest where mixed),
      'bands', (select jsonb_object_agg(st.s, jsonb_build_object(
                  'low', (select count(*) from latest where (scores->'natural'->st.s->>'pct')::int < 40),
                  'mid', (select count(*) from latest where (scores->'natural'->st.s->>'pct')::int between 40 and 59),
                  'high', (select count(*) from latest where (scores->'natural'->st.s->>'pct')::int >= 60))) from styles st),
      'pressure', jsonb_build_object(
                  'stable', (select count(*) from changes where changed = 0),
                  'one', (select count(*) from changes where changed = 1),
                  'many', (select count(*) from changes where changed >= 2),
                  'up', (select jsonb_object_agg(st.s, (select count(*) from latest where (scores->'adaptation'->>st.s)::int >= 25)) from styles st),
                  'down', (select jsonb_object_agg(st.s, (select count(*) from latest where (scores->'adaptation'->>st.s)::int <= -25)) from styles st)))
      into v_dist;
  end if;
  return jsonb_build_object(
    'link_id', v_link.id, 'title', v_link.title, 'company', coalesce(v_company, v_link.company_label), 'company_id', v_link.company_id, 'has_account', v_account,
    'purpose', v_link.purpose, 'moment', v_link.gestao_moment, 'sector', v_link.gestao_sector, 'goal', v_link.gestao_goal, 'note', v_link.gestao_note,
    'released_at', v_link.gestao_released_at, 'approved_at', v_link.gestao_approved_at, 'protocol', v_link.gestao_protocol,
    'signer', case when v_link.gestao_approved_at is not null then v_link.gestao_signer else cali_workspace.profile_signer_snapshot() end,
    'sent_log', case when v_admin then v_link.gestao_sent_log else '[]'::jsonb end,
    'n', v_n, 'invites', v_inv, 'dates', v_meta, 'dist', v_dist);
end $$;
revoke all on function cali_workspace.profile_gestao(uuid) from public, anon;
grant execute on function cali_workspace.profile_gestao(uuid) to authenticated;
