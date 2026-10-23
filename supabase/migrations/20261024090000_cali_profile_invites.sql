-- Perfil Comportamental CALI — convites com prazo, lembretes, validade de 6 meses e indicadores
-- (especificação "Prazos-Lembretes-Painel_Especificacao_v1", aprovada pela proprietária em 23/10/2026).
-- Cada convite é uma pessoa de um link (campanha), com token próprio e prazo próprio (fim do dia, Brasília, do
-- sétimo dia corrido após o envio; ajustável por link). Estados: Na fila → Enviado → Visualizado → Em andamento →
-- Respondido | Expirado | Recusou. Lembretes: D+1 (não abriu), meio do prazo (parcial), 24h antes (último toque);
-- para a empresa (ponto focal): véspera com pendentes e fechamento com a taxa. Só em dia útil, 8h–18h de Brasília.

alter table cali_workspace.profile_links
  add column if not exists deadline_days integer not null default 7,
  add column if not exists deadline_log jsonb not null default '[]'::jsonb,
  add column if not exists focal_name text,
  add column if not exists focal_email text;
alter table cali_workspace.profile_links drop constraint if exists profile_links_deadline_days_check;
alter table cali_workspace.profile_links add constraint profile_links_deadline_days_check check (deadline_days between 1 and 60);

alter table cali_workspace.profile_results
  add column if not exists invite_id uuid,
  add column if not exists renewal_30_at timestamptz,
  add column if not exists renewal_0_at timestamptz;

create table if not exists cali_workspace.profile_invites (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references cali_workspace.profile_links(id) on delete cascade,
  person_name text not null check (length(btrim(person_name)) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  team_member_id uuid references cali_workspace.team_members(id) on delete set null,
  token uuid not null unique default gen_random_uuid(),
  cycle integer not null default 1,
  previous_invite_id uuid references cali_workspace.profile_invites(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  sent_at timestamptz,
  deadline_at timestamptz,
  opened_at timestamptz,
  started_at timestamptz,
  last_block integer,
  progress_at timestamptz,
  completed_at timestamptz,
  result_id uuid references cali_workspace.profile_results(id) on delete set null,
  declined_at timestamptz,
  reminder1_at timestamptz,
  reminder2_at timestamptz,
  reminder3_at timestamptz,
  eve_notified_at timestamptz,
  close_notified_at timestamptz
);
create index if not exists profile_invites_link_idx on cali_workspace.profile_invites (link_id, created_at);
create unique index if not exists profile_invites_link_email_cycle on cali_workspace.profile_invites (link_id, lower(email), cycle);

alter table cali_workspace.profile_invites enable row level security;
drop policy if exists profile_invites_admin_all on cali_workspace.profile_invites;
create policy profile_invites_admin_all on cali_workspace.profile_invites for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
grant select, insert, update, delete on cali_workspace.profile_invites to authenticated;

-- Estado calculado (nunca digitado).
create or replace function cali_workspace.profile_invite_state(p_sent timestamptz, p_deadline timestamptz, p_opened timestamptz, p_started timestamptz, p_completed timestamptz, p_declined timestamptz)
returns text language sql stable set search_path to 'pg_catalog' as $$
  select case
    when p_completed is not null then 'completed'
    when p_declined is not null then 'declined'
    when p_sent is null then 'created'
    when p_deadline is not null and p_deadline < now() then 'expired'
    when p_started is not null then 'started'
    when p_opened is not null then 'opened'
    else 'sent' end;
$$;

create or replace view cali_workspace.profile_invite_status with (security_invoker = true) as
  select i.*, cali_workspace.profile_invite_state(i.sent_at, i.deadline_at, i.opened_at, i.started_at, i.completed_at, i.declined_at) as state
    from cali_workspace.profile_invites i;
grant select on cali_workspace.profile_invite_status to authenticated;

-- Fim do dia (23h59, Brasília) do N-ésimo dia corrido a partir de agora.
create or replace function cali_workspace.profile_deadline_from_now(p_days integer)
returns timestamptz language sql stable set search_path to 'pg_catalog' as $$
  select ((date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_days) + interval '23 hours 59 minutes') at time zone 'America/Sao_Paulo');
$$;

create or replace function cali_workspace.profile_post_invite_email(p_body jsonb)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_hook text;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key = 'notification_email_hook';
  if v_hook is null then return; end if;
  perform net.http_post(
    url := 'https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/cali-profile-invites',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-workspace-hook', v_hook),
    body := p_body);
end $$;
revoke all on function cali_workspace.profile_post_invite_email(jsonb) from public, anon, authenticated;

-- Administradora: envia os convites na fila (todos do link ou os escolhidos). Cada um ganha o próprio prazo.
create or replace function cali_workspace.profile_send_invites(p_link uuid, p_ids uuid[] default null)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_link cali_workspace.profile_links%rowtype; v_count integer := 0; v_deadline timestamptz; r record;
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_link from cali_workspace.profile_links where id = p_link;
  if not found then raise exception 'Link não encontrado.'; end if;
  if v_link.status <> 'open' then raise exception 'Este link está bloqueado. Desbloqueie para enviar convites.'; end if;
  v_deadline := cali_workspace.profile_deadline_from_now(v_link.deadline_days);
  for r in update cali_workspace.profile_invites set sent_at = now(), deadline_at = v_deadline
            where link_id = p_link and sent_at is null and declined_at is null and (p_ids is null or id = any(p_ids))
            returning id loop
    v_count := v_count + 1;
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'invite', 'invite_id', r.id));
  end loop;
  return jsonb_build_object('sent', v_count, 'deadline_at', v_deadline);
end $$;
revoke all on function cali_workspace.profile_send_invites(uuid, uuid[]) from public, anon;
grant execute on function cali_workspace.profile_send_invites(uuid, uuid[]) to authenticated;

-- Administradora: prorroga o prazo dos convites em aberto do link, com registro de quem, quando e por quê.
create or replace function cali_workspace.profile_extend_deadline(p_link uuid, p_until timestamptz, p_reason text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_count integer;
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  if p_until is null or p_until <= now() then raise exception 'Escolha uma data futura.'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Escreva o motivo da prorrogação.'; end if;
  update cali_workspace.profile_invites set deadline_at = p_until, eve_notified_at = null, close_notified_at = null
   where link_id = p_link and sent_at is not null and completed_at is null and declined_at is null;
  get diagnostics v_count = row_count;
  update cali_workspace.profile_links
     set deadline_log = deadline_log || jsonb_build_array(jsonb_build_object('at', now(), 'by', auth.uid(), 'to', p_until, 'reason', btrim(p_reason), 'invites', v_count))
   where id = p_link;
  return jsonb_build_object('updated', v_count);
end $$;
revoke all on function cali_workspace.profile_extend_deadline(uuid, timestamptz, text) from public, anon;
grant execute on function cali_workspace.profile_extend_deadline(uuid, timestamptz, text) to authenticated;

-- Administradora: renovação (6 meses). Abre um novo registro na fila; o anterior fica no histórico.
create or replace function cali_workspace.profile_renew_invite(p_invite uuid)
returns uuid language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_old cali_workspace.profile_invites%rowtype; v_id uuid;
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_old from cali_workspace.profile_invites where id = p_invite;
  if not found then raise exception 'Convite não encontrado.'; end if;
  insert into cali_workspace.profile_invites (link_id, person_name, email, team_member_id, cycle, previous_invite_id)
  values (v_old.link_id, v_old.person_name, v_old.email, v_old.team_member_id,
          (select coalesce(max(cycle), 0) + 1 from cali_workspace.profile_invites where link_id = v_old.link_id and lower(email) = lower(v_old.email)), v_old.id)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function cali_workspace.profile_renew_invite(uuid) from public, anon;
grant execute on function cali_workspace.profile_renew_invite(uuid) to authenticated;

-- Público (pelo token do convite): abrir, registrar progresso, recusar, responder.
create or replace function public.cali_profile_invite_open(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_inv cali_workspace.profile_invites%rowtype; v_link cali_workspace.profile_links%rowtype; v_state text;
begin
  select * into v_inv from cali_workspace.profile_invites where token = p_token;
  if not found then return null; end if;
  select * into v_link from cali_workspace.profile_links where id = v_inv.link_id;
  v_state := cali_workspace.profile_invite_state(v_inv.sent_at, v_inv.deadline_at, v_inv.opened_at, v_inv.started_at, v_inv.completed_at, v_inv.declined_at);
  if v_state in ('sent', 'opened', 'started') and v_inv.opened_at is null then
    update cali_workspace.profile_invites set opened_at = now() where id = v_inv.id;
    v_state := 'opened';
  end if;
  return jsonb_build_object('state', v_state, 'person_name', v_inv.person_name, 'email', v_inv.email, 'slug', v_link.slug,
                            'deadline_at', v_inv.deadline_at, 'last_block', v_inv.last_block);
end $$;
revoke all on function public.cali_profile_invite_open(uuid) from public;
grant execute on function public.cali_profile_invite_open(uuid) to anon, authenticated;

create or replace function public.cali_profile_invite_progress(p_token uuid, p_block integer)
returns void language sql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  update cali_workspace.profile_invites
     set started_at = coalesce(started_at, now()), last_block = greatest(coalesce(last_block, 0), least(greatest(coalesce(p_block, 0), 0), 24)), progress_at = now()
   where token = p_token and sent_at is not null and completed_at is null and declined_at is null and (deadline_at is null or deadline_at > now());
$$;
revoke all on function public.cali_profile_invite_progress(uuid, integer) from public;
grant execute on function public.cali_profile_invite_progress(uuid, integer) to anon, authenticated;

create or replace function public.cali_profile_invite_decline(p_token uuid)
returns jsonb language sql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  with done as (
    update cali_workspace.profile_invites set declined_at = coalesce(declined_at, now())
     where token = p_token and completed_at is null returning id)
  select jsonb_build_object('ok', exists (select 1 from done));
$$;
revoke all on function public.cali_profile_invite_decline(uuid) from public;
grant execute on function public.cali_profile_invite_decline(uuid) to anon, authenticated;

create or replace function public.cali_profile_submit_invite(p_token uuid, p_job_title text, p_answers jsonb, p_consent boolean)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_inv cali_workspace.profile_invites%rowtype; v_slug text; v_res jsonb; v_id uuid;
begin
  select * into v_inv from cali_workspace.profile_invites where token = p_token for update;
  if not found then raise exception 'Convite não encontrado.'; end if;
  if v_inv.completed_at is not null then raise exception 'Este convite já foi respondido.'; end if;
  if v_inv.declined_at is not null then raise exception 'Este convite foi encerrado a seu pedido.'; end if;
  if v_inv.sent_at is null then raise exception 'Este convite ainda não foi enviado.'; end if;
  if v_inv.deadline_at is not null and v_inv.deadline_at < now() then
    raise exception 'O prazo deste convite terminou em %. Fale com quem enviou o convite.', to_char(v_inv.deadline_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  end if;
  select slug into v_slug from cali_workspace.profile_links where id = v_inv.link_id;
  v_res := public.cali_profile_submit(v_slug, v_inv.person_name, v_inv.email, p_job_title, null, p_answers, p_consent);
  v_id := (v_res->>'id')::uuid;
  update cali_workspace.profile_invites set completed_at = now(), result_id = v_id, started_at = coalesce(started_at, now()) where id = v_inv.id;
  update cali_workspace.profile_results set invite_id = v_inv.id, team_member_id = coalesce(team_member_id, v_inv.team_member_id) where id = v_id;
  return v_res;
end $$;
revoke all on function public.cali_profile_submit_invite(uuid, text, jsonb, boolean) from public;
grant execute on function public.cali_profile_submit_invite(uuid, text, jsonb, boolean) to anon, authenticated;

-- Lembretes e avisos (pg_cron, de hora em hora). Só em dia útil, 8h–18h de Brasília; máximo de 3 toques por pessoa.
create or replace function cali_workspace.dispatch_profile_invite_reminders()
returns integer language plpgsql security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_br timestamp := now() at time zone 'America/Sao_Paulo'; v_count integer := 0; r record;
begin
  if extract(isodow from v_br) > 5 or extract(hour from v_br) < 8 or extract(hour from v_br) >= 18 then return 0; end if;

  -- 1º toque: 24h depois do envio, só para quem não abriu.
  for r in update cali_workspace.profile_invites set reminder1_at = now()
            where sent_at <= now() - interval '24 hours' and opened_at is null and reminder1_at is null
              and completed_at is null and declined_at is null and deadline_at > now() + interval '24 hours'
            returning id loop
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'reminder1', 'invite_id', r.id)); v_count := v_count + 1;
  end loop;

  -- 2º toque: metade do prazo, para quem abriu e não concluiu (link de retomada).
  for r in update cali_workspace.profile_invites set reminder2_at = now()
            where opened_at is not null and reminder2_at is null and completed_at is null and declined_at is null
              and now() >= sent_at + (deadline_at - sent_at) / 2 and deadline_at > now() + interval '24 hours'
            returning id loop
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'reminder2', 'invite_id', r.id)); v_count := v_count + 1;
  end loop;

  -- 3º e último toque: 24h antes de fechar (ou na sexta, se o prazo cair no fim de semana).
  for r in update cali_workspace.profile_invites set reminder3_at = now()
            where reminder3_at is null and completed_at is null and declined_at is null and sent_at is not null and deadline_at > now()
              and (now() >= deadline_at - interval '24 hours'
                   or (extract(isodow from v_br) = 5 and extract(isodow from deadline_at at time zone 'America/Sao_Paulo') in (6, 7) and deadline_at - now() <= interval '64 hours'))
            returning id loop
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'reminder3', 'invite_id', r.id)); v_count := v_count + 1;
  end loop;

  -- Empresa (ponto focal): véspera do fechamento, com a lista de pendentes (só estado, nunca conteúdo).
  for r in select i.link_id, i.deadline_at from cali_workspace.profile_invites i join cali_workspace.profile_links l on l.id = i.link_id
            where l.focal_email is not null and i.sent_at is not null and i.eve_notified_at is null and i.deadline_at > now()
              and (now() >= i.deadline_at - interval '24 hours'
                   or (extract(isodow from v_br) = 5 and extract(isodow from i.deadline_at at time zone 'America/Sao_Paulo') in (6, 7) and i.deadline_at - now() <= interval '64 hours'))
            group by i.link_id, i.deadline_at loop
    update cali_workspace.profile_invites set eve_notified_at = now() where link_id = r.link_id and deadline_at = r.deadline_at and sent_at is not null;
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'focal_eve', 'link_id', r.link_id, 'deadline_at', r.deadline_at)); v_count := v_count + 1;
  end loop;

  -- Empresa: fechamento (quantos responderam, quantos expiraram, taxa final).
  for r in select i.link_id, i.deadline_at from cali_workspace.profile_invites i join cali_workspace.profile_links l on l.id = i.link_id
            where l.focal_email is not null and i.sent_at is not null and i.close_notified_at is null and i.deadline_at <= now()
            group by i.link_id, i.deadline_at loop
    update cali_workspace.profile_invites set close_notified_at = now() where link_id = r.link_id and deadline_at = r.deadline_at and sent_at is not null;
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'focal_close', 'link_id', r.link_id, 'deadline_at', r.deadline_at)); v_count := v_count + 1;
  end loop;

  -- Validade de 6 meses: aviso à empresa 30 dias antes e no dia do vencimento.
  for r in select res.link_id, array_agg(res.id) as ids from cali_workspace.profile_results res join cali_workspace.profile_links l on l.id = res.link_id
            where l.focal_email is not null and res.renewal_30_at is null and res.created_at + interval '6 months' - interval '30 days' <= now()
              and res.created_at + interval '6 months' > now()
            group by res.link_id loop
    update cali_workspace.profile_results set renewal_30_at = now() where id = any(r.ids);
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'renewal30', 'link_id', r.link_id, 'result_ids', to_jsonb(r.ids))); v_count := v_count + 1;
  end loop;
  for r in select res.link_id, array_agg(res.id) as ids from cali_workspace.profile_results res join cali_workspace.profile_links l on l.id = res.link_id
            where l.focal_email is not null and res.renewal_0_at is null and res.created_at + interval '6 months' <= now()
            group by res.link_id loop
    update cali_workspace.profile_results set renewal_0_at = now() where id = any(r.ids);
    perform cali_workspace.profile_post_invite_email(jsonb_build_object('kind', 'renewal0', 'link_id', r.link_id, 'result_ids', to_jsonb(r.ids))); v_count := v_count + 1;
  end loop;

  return v_count;
end $$;
revoke all on function cali_workspace.dispatch_profile_invite_reminders() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'workspace-profile-invite-reminders';
select cron.schedule('workspace-profile-invite-reminders', '5 * * * *', 'select cali_workspace.dispatch_profile_invite_reminders();');
