begin;

alter table cali_workspace.work_timers
  add column partner_managed boolean not null default false,
  add column presence_warned_for timestamptz,
  add column partner_recovery_reason text
    check (partner_recovery_reason in ('inactivity', 'legacy_overlap')),
  add column partner_counted_seconds integer check (partner_counted_seconds >= 0);

alter table cali_workspace.staff_hour_submissions
  add column timer_source_id uuid unique,
  add column timer_started_at timestamptz,
  add column timer_ended_at timestamptz,
  add column timer_seconds integer check (timer_seconds >= 0),
  add column timer_cycle_id uuid references cali_workspace.service_cycles(id) on delete set null,
  add column timer_task_id uuid references cali_workspace.deliverable_tasks(id) on delete set null,
  add column approved_hour_entry_id uuid references cali_workspace.hour_entries(id) on delete set null;

alter policy staff_hours_self_insert on cali_workspace.staff_hour_submissions
  with check (
    (select cali_workspace.is_partner()) and staff_user_id = (select auth.uid())
    and status = 'pending' and decided_by is null and decided_at is null and decision_note is null
    and cali_workspace.partner_can_access(company_id, 'hours')
    and timer_source_id is null and timer_started_at is null and timer_ended_at is null
    and timer_seconds is null and timer_cycle_id is null and timer_task_id is null
    and approved_hour_entry_id is null
  );

update cali_workspace.work_timers t set partner_managed = true
where exists (select 1 from cali_workspace.profiles p where p.id = t.user_id and p.role = 'partner');

-- Conserva o trecho dos timers simultâneos do legado e mantém aberto o mais recente.
with open_timers as (
  select t.id,
    greatest(t.started_at, coalesce(t.paused_at, t.last_seen_at, t.started_at)) as counted_until,
    row_number() over (
      partition by t.user_id order by coalesce(t.last_seen_at, t.started_at) desc, t.started_at desc, t.id
    ) as position
  from cali_workspace.work_timers t
  where t.partner_managed and t.status in ('active', 'paused')
), recovered as (
  select t.id, o.counted_until,
    greatest(0, floor(extract(epoch from o.counted_until - t.started_at))::integer - t.paused_seconds) as seconds
  from open_timers o join cali_workspace.work_timers t on t.id = o.id where o.position > 1
)
update cali_workspace.work_timers t
set status = 'stopped', stopped_at = r.counted_until, paused_at = null,
  minutes = least(1440, ceil(r.seconds / 60.0)::integer),
  partner_counted_seconds = r.seconds, partner_recovery_reason = 'legacy_overlap'
from recovered r where t.id = r.id;

create unique index work_timers_one_open_per_partner_v2
  on cali_workspace.work_timers(user_id)
  where partner_managed and status in ('active', 'paused');

create index work_timers_partner_inactivity_v2
  on cali_workspace.work_timers ((coalesce(last_seen_at, started_at)))
  where partner_managed and status = 'active';

create function cali_session_guard.classify_partner_work_timer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.user_id = new.user_id and old.partner_managed then
    new.partner_managed := true;
  else
    new.partner_managed := exists (
      select 1 from cali_workspace.profiles p where p.id = new.user_id and p.role = 'partner'
    );
  end if;
  return new;
end;
$$;

create trigger classify_partner_work_timer_v2
  before insert or update of user_id, partner_managed on cali_workspace.work_timers
  for each row execute function cali_session_guard.classify_partner_work_timer();

create function cali_session_guard.partner_timer_elapsed_seconds(
  timer cali_workspace.work_timers, counted_until timestamptz
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(0, floor(extract(epoch from counted_until - timer.started_at))::integer - timer.paused_seconds);
$$;

create function cali_session_guard.queue_partner_timer_review(
  timer cali_workspace.work_timers, justification text, minutes integer
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  submission_id uuid;
begin
  insert into cali_workspace.staff_hour_submissions (
    staff_user_id, company_id, project_id, deliverable_id, account_record_id,
    work_date, minutes, description, justification, category, timer_source_id,
    timer_started_at, timer_ended_at, timer_seconds, timer_cycle_id, timer_task_id
  ) values (
    timer.user_id, timer.company_id, timer.project_id, timer.deliverable_id, timer.account_record_id,
    (timer.stopped_at at time zone 'America/Sao_Paulo')::date, minutes,
    case when char_length(btrim(coalesce(timer.description, ''))) >= 3 then left(btrim(timer.description), 500)
      else 'Atividade registrada por cronômetro' end,
    justification, coalesce(timer.category, 'Execução'), timer.id,
    timer.started_at, timer.stopped_at, timer.partner_counted_seconds, timer.cycle_id, timer.task_id
  )
  returning id into submission_id;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(timer.company_id,timer.user_id,'partner_timer_review_submitted','work_timer',timer.id,
    jsonb_build_object('submission_id',submission_id,'seconds',timer.partner_counted_seconds,
      'minutes',minutes,'recovery_reason',timer.partner_recovery_reason));
  return submission_id;
end;
$$;

-- Deve ser chamada com lock do timer. O marcador é por último sinal, não por dia.
create function cali_session_guard.advance_partner_timer(
  timer cali_workspace.work_timers, observed_at timestamptz
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  last_presence timestamptz := greatest(timer.started_at, coalesce(timer.last_seen_at, timer.started_at));
  expired boolean := observed_at >= last_presence + interval '30 minutes';
  warning_due boolean := observed_at >= last_presence + interval '25 minutes'
    and timer.presence_warned_for is distinct from last_presence;
  counted_seconds integer;
  warning_title text := case when expired then 'Cronômetro pausado por inatividade' else 'Confirme presença no cronômetro' end;
  warning_body text := case when expired
    then 'O cronômetro foi pausado após 30 minutos sem atividade. O trecho registrado está disponível em Horas.'
    else 'O cronômetro está há 25 minutos sem atividade no Workspace. Use Continuo aqui para manter a contagem.' end;
  admin_email text := coalesce((
    select nullif(lower(btrim(secret_value)), '') from cali_workspace.runtime_secrets
    where secret_key = 'partner_timer_admin_email'
  ), 'patricia@calirh.com');
  recipient record;
begin
  if not timer.partner_managed or timer.status <> 'active' or not (expired or warning_due) then
    return false;
  end if;

  if warning_due then
    update cali_workspace.work_timers set presence_warned_for = last_presence where id = timer.id;
  end if;
  if expired then
    counted_seconds := cali_session_guard.partner_timer_elapsed_seconds(timer, last_presence);
    update cali_workspace.work_timers set status = 'stopped', stopped_at = last_presence, paused_at = null,
      minutes = least(1440, ceil(counted_seconds / 60.0)::integer),
      partner_counted_seconds = counted_seconds, partner_recovery_reason = 'inactivity'
    where id = timer.id;
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(timer.company_id,timer.user_id,'timer_auto_paused_inactivity','work_timer',timer.id,
      jsonb_build_object('started_at',timer.started_at,'counted_until',last_presence,'seconds',counted_seconds,'staff',true));
  end if;

  for recipient in
    select p.id, lower(btrim(p.email)) as email, p.full_name, p.role,
      case when p.role = 'admin' then '/admin/horas' else '/equipe/horas' end as action_url
    from cali_workspace.profiles p
    where p.active and (
      (p.role = 'admin' and lower(btrim(p.email)) = admin_email)
      or (p.id = timer.user_id and p.role = 'partner' and exists (
        select 1 from cali_workspace.staff_members s
        join cali_workspace.staff_company_assignments a on a.staff_id = s.id
        join cali_workspace.companies c on c.id = a.company_id
        where s.user_id = p.id and s.active and 'hours' = any(s.modules)
          and a.company_id = timer.company_id and c.status in ('active', 'paused')
      ))
    )
    and cali_session_guard.profile_login_eligible(p.id)
  loop
    insert into cali_workspace.notifications (
      company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required
    ) values (
      timer.company_id,recipient.id,case when expired then 'timer_auto_paused' else 'timer_presence_warning' end,
      warning_title,warning_body,'work_timer',timer.id,recipient.action_url,'high',false
    );
    if warning_due then
      insert into cali_workspace.communication_outbox (
        company_id,template_key,recipient_email,recipient_name,subject,body_html,scheduled_for,metadata
      ) values (
        timer.company_id,'partner_timer_presence_warning',recipient.email,recipient.full_name,
        warning_title,'<p>' || warning_body || '</p>',observed_at,
        jsonb_build_object('timer_id',timer.id,'recipient_user_id',recipient.id,'last_seen_at',last_presence,
          'action_url',recipient.action_url,'event_key',timer.id::text || ':' || last_presence::text || ':' || recipient.id::text)
      );
    end if;
  end loop;
  return true;
end;
$$;

create function cali_workspace.advance_partner_timers_v2()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
  observed_at timestamptz := clock_timestamp();
  advanced integer := 0;
begin
  for timer in
    select t.* from cali_workspace.work_timers t
    where t.partner_managed and t.status = 'active'
      and coalesce(t.last_seen_at, t.started_at) <= observed_at - interval '25 minutes'
      and (
        t.presence_warned_for is distinct from coalesce(t.last_seen_at, t.started_at)
        or coalesce(t.last_seen_at, t.started_at) <= observed_at - interval '30 minutes'
      )
    order by coalesce(t.last_seen_at, t.started_at), t.id limit 200 for update skip locked
  loop
    if cali_session_guard.advance_partner_timer(timer, observed_at) then
      advanced := advanced + 1;
    end if;
  end loop;
  return advanced;
end;
$$;

create function cali_workspace.touch_partner_timer_v2(
  p_timer_id uuid, p_confirm_presence boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
  observed_at timestamptz;
  last_presence timestamptz;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner() then
    raise exception using errcode = '42501', message = 'Acesso ao cronômetro indisponível.';
  end if;
  select t.* into timer from cali_workspace.work_timers t
  where t.id = p_timer_id and t.user_id = auth.uid() and t.partner_managed and t.status = 'active'
    and cali_workspace.partner_can_access(t.company_id, 'hours')
  for update;
  if not found then return false; end if;

  observed_at := clock_timestamp();
  last_presence := greatest(timer.started_at, coalesce(timer.last_seen_at, timer.started_at));
  if observed_at >= last_presence + interval '30 minutes'
    or (observed_at >= last_presence + interval '25 minutes' and not coalesce(p_confirm_presence, false))
  then
    perform cali_session_guard.advance_partner_timer(timer, observed_at);
    return false;
  end if;

  if coalesce(p_confirm_presence, false) or observed_at >= last_presence + interval '90 seconds' then
    update cali_workspace.work_timers set last_seen_at = observed_at where id = timer.id;
  end if;
  return true;
end;
$$;

create function cali_workspace.read_partner_timer_state_v2()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
  last_presence timestamptz;
  state jsonb;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner() then
    raise exception using errcode = '42501', message = 'Acesso ao cronômetro indisponível.';
  end if;

  select t.* into timer from cali_workspace.work_timers t
  where t.user_id = auth.uid() and t.partner_managed and t.status in ('active', 'paused')
    and cali_workspace.partner_can_access(t.company_id, 'hours')
  for update;

  if found then
    perform cali_session_guard.advance_partner_timer(timer, clock_timestamp());
    select * into timer from cali_workspace.work_timers where id = timer.id;
    if timer.status in ('active', 'paused') then
      last_presence := greatest(timer.started_at, coalesce(timer.last_seen_at, timer.started_at));
      state := jsonb_build_object('id',timer.id,'companyId',timer.company_id,'description',timer.description,
        'status',timer.status,'startedAt',timer.started_at,'lastSeenAt',last_presence,'pausedSeconds',timer.paused_seconds,
        'warningAt',last_presence + interval '25 minutes','pauseAt',last_presence + interval '30 minutes');
    end if;
  end if;

  return jsonb_build_object('active', state, 'recoveries', coalesce((
    select jsonb_agg(jsonb_build_object('id',t.id,'companyId',t.company_id,'description',t.description,
      'startedAt',t.started_at,'countedUntil',t.stopped_at,'seconds',t.partner_counted_seconds,'minutes',t.minutes)
      order by t.stopped_at desc, t.id)
    from cali_workspace.work_timers t
    where t.user_id = auth.uid() and t.partner_recovery_reason is not null
      and cali_workspace.partner_can_access(t.company_id, 'hours')
      and not exists (select 1 from cali_workspace.staff_hour_submissions s where s.timer_source_id = t.id)
  ), '[]'::jsonb));
end;
$$;

create function cali_workspace.submit_partner_timer_recovery_v2(
  p_timer_id uuid, p_justification text, p_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  timer cali_workspace.work_timers;
  submission cali_workspace.staff_hour_submissions;
  justification text := btrim(coalesce(p_justification, ''));
  minutes integer;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner() then
    raise exception using errcode = '42501', message = 'Acesso ao cronômetro indisponível.';
  end if;
  select t.* into timer from cali_workspace.work_timers t
  where t.id = p_timer_id and t.user_id = auth.uid() and t.partner_recovery_reason is not null
    and cali_workspace.partner_can_access(t.company_id, 'hours')
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'Trecho indisponível para justificar.';
  end if;

  minutes := coalesce(p_minutes, timer.minutes);
  if char_length(justification) not between 10 and 1500 or minutes not between 1 and 1440 then
    raise exception using errcode = '22023', message = 'Informe entre 1 e 1440 minutos e uma justificativa de 10 a 1500 caracteres.';
  end if;
  select s.* into submission from cali_workspace.staff_hour_submissions s where s.timer_source_id = timer.id;
  if found then
    if submission.justification is distinct from justification or submission.minutes is distinct from minutes then
      raise exception using errcode = '23514', message = 'Este trecho já foi enviado para revisão.';
    end if;
    return jsonb_build_object('submission_id',submission.id,'minutes',submission.minutes);
  end if;
  return jsonb_build_object('submission_id',cali_session_guard.queue_partner_timer_review(timer,justification,minutes),
    'minutes',minutes);
end;
$$;

alter function cali_session_guard.classify_partner_work_timer() owner to postgres;
alter function cali_session_guard.partner_timer_elapsed_seconds(cali_workspace.work_timers, timestamptz) owner to postgres;
alter function cali_session_guard.queue_partner_timer_review(cali_workspace.work_timers, text, integer) owner to postgres;
alter function cali_session_guard.advance_partner_timer(cali_workspace.work_timers, timestamptz) owner to postgres;
alter function cali_workspace.advance_partner_timers_v2() owner to postgres;
alter function cali_workspace.touch_partner_timer_v2(uuid, boolean) owner to postgres;
alter function cali_workspace.read_partner_timer_state_v2() owner to postgres;
alter function cali_workspace.submit_partner_timer_recovery_v2(uuid, text, integer) owner to postgres;
revoke all on function cali_session_guard.classify_partner_work_timer(),
  cali_session_guard.partner_timer_elapsed_seconds(cali_workspace.work_timers, timestamptz),
  cali_session_guard.queue_partner_timer_review(cali_workspace.work_timers, text, integer),
  cali_session_guard.advance_partner_timer(cali_workspace.work_timers, timestamptz),
  cali_workspace.advance_partner_timers_v2(), cali_workspace.touch_partner_timer_v2(uuid, boolean),
  cali_workspace.read_partner_timer_state_v2(), cali_workspace.submit_partner_timer_recovery_v2(uuid, text, integer)
from public, anon, authenticated, service_role;
grant execute on function cali_workspace.advance_partner_timers_v2() to service_role;
grant execute on function cali_workspace.touch_partner_timer_v2(uuid, boolean),
  cali_workspace.read_partner_timer_state_v2(), cali_workspace.submit_partner_timer_recovery_v2(uuid, text, integer)
to authenticated;

-- O QA mantém cron.launch_active_jobs=off e chama a rotina de forma controlada.
select cron.schedule('workspace-partner-timer-presence-v2', '* * * * *', 'select cali_workspace.advance_partner_timers_v2()');

notify pgrst, 'reload schema';
commit;
