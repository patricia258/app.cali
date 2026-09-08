-- CALI Workspace · Relatórios V71
-- A agenda do relatório passa a distinguir compromisso agendado de encontro efetivamente realizado.
-- Mantém as chaves V66 existentes por compatibilidade e acrescenta métricas canônicas de execução.

create or replace function cali_workspace.build_agenda_compliance_v66(
  p_company_id uuid,
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, cali_workspace
as $$
declare
  v_policy jsonb;
  v_months int;
  v_required int;
  v_items jsonb;
  v_month_rows jsonb;
  v_occ int;
  v_not int;
  v_pending int;
  v_future int;
  v_extra int;
  v_remote int;
  v_onsite int;
  v_included_occ int;
  v_extra_occ int;
  v_remote_occ int;
  v_onsite_occ int;
begin
  v_policy := cali_workspace.company_meeting_policy_v66(p_company_id);

  select count(*)::int into v_months
  from generate_series(
    date_trunc('month', p_period_start)::date,
    date_trunc('month', p_period_end)::date,
    '1 month'::interval
  );

  v_required := coalesce((v_policy->>'sessionsPerMonth')::int, 0) * v_months;

  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'protocol', e.protocol,
        'title', e.title,
        'startsAt', e.starts_at,
        'endsAt', e.ends_at,
        'mode', e.mode,
        'sessionNumber', e.contract_session_number,
        'scheduleClass', e.schedule_class,
        'outcome', coalesce(o.outcome, case when e.starts_at < now() then 'pending_outcome' else 'scheduled' end),
        'reasonCategory', o.reason_category,
        'justified', o.justified,
        'note', o.note,
        'billingApplies', e.billing_applies,
        'billingReason', e.billing_reason,
        'transcriptionUrl', o.transcription_url,
        'transcriptionNote', o.transcription_note
      ) order by e.starts_at
    ), '[]'::jsonb),
    count(*) filter (where o.outcome = 'occurred'),
    count(*) filter (where o.outcome = 'not_occurred'),
    count(*) filter (where o.outcome is null and e.starts_at < now()),
    count(*) filter (where o.outcome is null and e.starts_at >= now()),
    count(*) filter (where e.schedule_class = 'extra'),
    count(*) filter (where e.schedule_class = 'contractual' and e.mode = 'remote'),
    count(*) filter (where e.schedule_class = 'contractual' and e.mode = 'in_person'),
    count(*) filter (where o.outcome = 'occurred' and e.schedule_class = 'contractual'),
    count(*) filter (where o.outcome = 'occurred' and (e.schedule_class = 'extra' or e.billing_applies is true)),
    count(*) filter (where o.outcome = 'occurred' and e.mode = 'remote'),
    count(*) filter (where o.outcome = 'occurred' and e.mode = 'in_person')
  into
    v_items, v_occ, v_not, v_pending, v_future, v_extra, v_remote, v_onsite,
    v_included_occ, v_extra_occ, v_remote_occ, v_onsite_occ
  from cali_workspace.events e
  left join cali_workspace.event_outcomes o on o.event_id = e.id
  where e.company_id = p_company_id
    and e.cancelled_at is null
    and e.event_type = 'meeting'
    and e.starts_at::date between p_period_start and p_period_end
    and e.schedule_class in ('contractual', 'extra');

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(m.month_start, 'YYYY-MM'),
      'required', coalesce((v_policy->>'sessionsPerMonth')::int, 0),
      'occurred', coalesce(x.occurred, 0),
      'notOccurred', coalesce(x.not_occurred, 0),
      'pendingOutcome', coalesce(x.pending_outcome, 0),
      'scheduled', coalesce(x.scheduled, 0),
      'contractualCount', coalesce(x.contractual_count, 0)
    ) order by m.month_start
  ), '[]'::jsonb)
  into v_month_rows
  from (
    select generate_series(
      date_trunc('month', p_period_start)::date,
      date_trunc('month', p_period_end)::date,
      '1 month'::interval
    )::date month_start
  ) m
  left join lateral (
    select
      count(*) filter (where o.outcome = 'occurred') occurred,
      count(*) filter (where o.outcome = 'not_occurred') not_occurred,
      count(*) filter (where o.outcome is null and e.starts_at < now()) pending_outcome,
      count(*) filter (where o.outcome is null and e.starts_at >= now()) scheduled,
      count(*) filter (where e.schedule_class = 'contractual') contractual_count
    from cali_workspace.events e
    left join cali_workspace.event_outcomes o on o.event_id = e.id
    where e.company_id = p_company_id
      and e.cancelled_at is null
      and e.event_type = 'meeting'
      and e.schedule_class = 'contractual'
      and date_trunc('month', e.starts_at at time zone 'America/Sao_Paulo')::date = m.month_start
  ) x on true;

  return v_policy || jsonb_build_object(
    'periodStart', p_period_start,
    'periodEnd', p_period_end,
    'months', v_months,
    'requiredTotal', v_required,
    'occurredCount', coalesce(v_occ, 0),
    'notOccurredCount', coalesce(v_not, 0),
    'pendingOutcomeCount', coalesce(v_pending, 0),
    'scheduledCount', coalesce(v_future, 0),
    'extraCount', coalesce(v_extra, 0),
    'remoteContractualCount', coalesce(v_remote, 0),
    'inPersonContractualCount', coalesce(v_onsite, 0),
    'includedOccurredCount', coalesce(v_included_occ, 0),
    'extraOccurredCount', coalesce(v_extra_occ, 0),
    'remoteOccurredCount', coalesce(v_remote_occ, 0),
    'inPersonOccurredCount', coalesce(v_onsite_occ, 0),
    'items', v_items,
    'monthly', v_month_rows,
    'nonCumulative', true
  );
end;
$$;

grant execute on function cali_workspace.build_agenda_compliance_v66(uuid,date,date) to authenticated, service_role;

comment on function cali_workspace.build_agenda_compliance_v66(uuid,date,date) is
  'Agenda contratual por período: distingue encontros agendados, realizados, não realizados, inclusos e adicionais para o fechamento executivo.';
