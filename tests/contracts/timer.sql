do $record$
declare
  fixture_record uuid := gen_random_uuid();
begin
  insert into cali_workspace.account_records(id,company_id,title,visibility,workflow_status)
  values(fixture_record,'ca110000-0000-4000-8000-000000000001','QA cronômetro','client','open');
  perform set_config('qa.timer_record',fixture_record::text,true);
end;
$record$;

set local role authenticated;
do $start$
declare
  fixture_record uuid := current_setting('qa.timer_record')::uuid;
  fixture_timer uuid;
begin
  perform set_config('request.jwt.claims',current_setting('qa.claims_partner'),true);
  fixture_timer := cali_workspace.partner_start_record_timer(fixture_record);
  if fixture_timer is null or cali_workspace.partner_start_record_timer(fixture_record) <> fixture_timer
    or cali_workspace.read_partner_timer_state_v2()->'active'->>'id' is distinct from fixture_timer::text
  then raise exception 'Start não é persistente ou idempotente.'; end if;
  perform set_config('qa.timer_id',fixture_timer::text,true);
end;
$start$;

reset role;
do $unique$
begin
  begin
    insert into cali_workspace.work_timers(company_id,user_id,status,description)
    values('ca110000-0000-4000-8000-000000000002',(current_setting('qa.claims_partner')::jsonb->>'sub')::uuid,'active','QA segundo timer');
    raise exception 'Banco permitiu dois timers Partner simultâneos.';
  exception when unique_violation then null;
  end;
end;
$unique$;
update cali_workspace.work_timers set started_at=clock_timestamp()-interval '34 minutes',
  last_seen_at=clock_timestamp()-interval '26 minutes' where id=current_setting('qa.timer_id')::uuid;
select cali_workspace.advance_partner_timers_v2() is not null;
select cali_workspace.advance_partner_timers_v2() is not null;

do $mail$
begin
  if (select count(*) from cali_workspace.communication_outbox o
    where o.template_key='partner_timer_presence_warning' and o.metadata->>'timer_id'=current_setting('qa.timer_id')) <> 2
  then raise exception 'Alerta não gerou um recibo por destinatário no episódio.'; end if;
end;
$mail$;

set local role authenticated;
do $presence$
declare
  fixture_timer uuid := current_setting('qa.timer_id')::uuid;
begin
  if cali_workspace.touch_partner_timer_v2(fixture_timer,false)
    or not cali_workspace.touch_partner_timer_v2(fixture_timer,true)
  then raise exception 'Heartbeat renovou aviso ou confirmação explícita falhou.'; end if;
end;
$presence$;
reset role;
update cali_workspace.work_timers set started_at=clock_timestamp()-interval '42 minutes',
  last_seen_at=clock_timestamp()-interval '31 minutes' where id=current_setting('qa.timer_id')::uuid;
select cali_workspace.advance_partner_timers_v2() is not null;

set local role authenticated;
do $review$
declare
  fixture_timer uuid := current_setting('qa.timer_id')::uuid;
  state jsonb;
  review jsonb;
  fixture_review uuid;
begin
  state := cali_workspace.read_partner_timer_state_v2();
  if state->'active' is distinct from 'null'::jsonb
    or (state->'recoveries'->0->>'seconds')::int not between 660 and 661
    or cali_workspace.touch_partner_timer_v2(fixture_timer,true)
  then raise exception 'Pausa não preservou tempo ou reativou pelo JWT antigo do timer.'; end if;
  review := cali_workspace.submit_partner_timer_recovery_v2(fixture_timer,'Estava em reunião externa.',15);
  if review is distinct from cali_workspace.submit_partner_timer_recovery_v2(fixture_timer,'Estava em reunião externa.',15)
    or review->>'submission_id' is null
  then raise exception 'A justificativa foi duplicada.'; end if;
  fixture_review := (review->>'submission_id')::uuid;
  begin
    perform cali_workspace.admin_decide_staff_hours(fixture_review,true);
    raise exception 'Partner aprovou o próprio lançamento.';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims',current_setting('qa.claims_admin'),true);
  if exists(select 1 from cali_workspace.hour_entries e where e.account_record_id=current_setting('qa.timer_record')::uuid) then
    raise exception 'Extrato gravado antes da aprovação.';
  end if;
  perform cali_workspace.admin_decide_staff_hours(fixture_review,true);
  perform cali_workspace.admin_decide_staff_hours(fixture_review,true);
  if (select count(*) from cali_workspace.hour_entries e where e.account_record_id=current_setting('qa.timer_record')::uuid
    and e.minutes=15 and e.source_type='timer' and not e.client_visible) <> 1
  then raise exception 'Aprovação perdeu vínculo ou duplicou o extrato.'; end if;
end;
$review$;
reset role;
