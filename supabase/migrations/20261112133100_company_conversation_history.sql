begin;
set local lock_timeout = '5s';

create or replace function cali_workspace.read_company_conversation_history(
  p_company_id uuid,
  p_kind text default null,
  p_before_at timestamptz default null,
  p_before_id text default null
) returns table (
  id text, kind text, happened_at timestamptz, title text,
  subject_type text, subject_id uuid, subject_title text, minutes integer
) language plpgsql stable security invoker set search_path = '' as $$
begin
  if cali_workspace.workspace_private_access_v2() is not true
    or not (
      cali_workspace.is_admin() or p_company_id = cali_workspace.current_company_id()
      or cali_workspace.partner_can_access(p_company_id, 'records')
      or cali_workspace.partner_can_access(p_company_id, 'projects')
    ) is true then
    raise exception using errcode = '42501', message = 'Histórico indisponível.';
  end if;
  if p_company_id is null or (p_before_at is null) <> (p_before_id is null)
    or (p_kind is not null and p_kind not in ('record','delivery','closure','reopen','approval','hours')) then
    raise exception using errcode = '22023', message = 'Recorte inválido.';
  end if;

  return query
  with records as (
    select r.id, r.title, r.created_at
    from cali_workspace.account_records r where r.company_id = p_company_id
      and (r.visibility = 'client' or cali_workspace.is_admin())
  ), deliveries as (
    select d.id, d.title, d.created_at, d.approved_at
    from cali_workspace.deliverables d where d.company_id = p_company_id
  ), timeline as (
    select 'record:' || r.id, 'record', r.created_at, 'Ocorrência aberta', 'record', r.id, r.title, null::integer
    from records r
    union all
    select 'delivery:' || d.id, 'delivery', d.created_at, 'Entregável', 'delivery', d.id, d.title, null
    from deliveries d
    union all
    select 'closure:' || c.id, 'closure', c.closed_at, 'Ocorrência finalizada', 'record', r.id, r.title, null
    from records r join cali_workspace.account_record_closures c on c.record_id = r.id
    union all
    select 'reopen:' || q.id, 'reopen', q.decided_at,
      case q.status when 'approved' then 'Reabertura aprovada' else 'Reabertura recusada' end,
      'record', r.id, r.title, null
    from records r join cali_workspace.account_record_reopen_requests q on q.record_id = r.id
    where q.company_id = p_company_id and q.status in ('approved', 'rejected') and q.decided_at is not null
    union all
    select 'approval:' || d.id, 'approval', d.approved_at, 'Entregável aprovado', 'delivery', d.id, d.title, null
    from deliveries d where d.approved_at is not null
    union all
    select 'hours:' || h.id, 'hours', h.work_date::timestamp at time zone 'America/Sao_Paulo',
      'Horas registradas', case when r.id is not null then 'record' else 'delivery' end,
      coalesce(r.id, d.id), coalesce(r.title, d.title), h.minutes::integer
    from cali_workspace.hour_entries h
    left join records r on r.id = h.account_record_id
    left join deliveries d on d.id = h.deliverable_id
    where h.company_id = p_company_id and (r.id is not null or d.id is not null)
  )
  select e.* from timeline e(entry_id, entry_kind, entry_at, entry_title, entity_type, entity_id, entity_title, duration)
  where (p_kind is null or e.entry_kind = p_kind)
    and (p_before_at is null or (e.entry_at, e.entry_id) < (p_before_at, p_before_id))
  order by e.entry_at desc, e.entry_id desc limit 26;
end;
$$;

revoke all on function cali_workspace.read_company_conversation_history(uuid,text,timestamptz,text) from public, anon;
grant execute on function cali_workspace.read_company_conversation_history(uuid,text,timestamptz,text) to authenticated;
notify pgrst, 'reload schema';
commit;
