begin;

-- Este helper concede o recorte de Cliente. Admin e Partner têm predicados próprios.
create or replace function cali_workspace.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id from cali_workspace.profiles p
  where p.id = (select auth.uid()) and p.active and p.role = 'client'
    and (select cali_session_guard.session_is_live());
$$;

-- Três RPCs usam IF NOT can_access_company. Ausência de vínculo precisa retornar false.
create or replace function cali_workspace.can_access_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cali_workspace.is_admin() or coalesce(target_company_id = cali_workspace.current_company_id(), false);
$$;

do $extra_visit$
declare
  definition text := pg_get_functiondef('cali_workspace.attach_extra_visit_request_v1(uuid,text,text)'::regprocedure);
  original text := 'v_company<>cali_workspace.current_company_id()';
begin
  if strpos(definition,original) = 0 then
    raise exception 'A rotina de anexo de visita diverge do catálogo reconciliado.';
  end if;
  execute replace(definition,original,'v_company is distinct from cali_workspace.current_company_id()');
end;
$extra_visit$;

create or replace function cali_workspace.partner_set_record_status(p_record_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  occurrence cali_workspace.account_records;
  label text;
begin
  if not cali_workspace.workspace_private_access_v2() or not cali_workspace.is_partner() then
    raise exception using errcode = '42501', message = 'Ocorrência indisponível para este acesso.';
  end if;
  if p_status is null or p_status not in ('in_progress', 'waiting_client', 'standby') then
    raise exception using errcode = '42501', message = 'Somente a Patricia pode finalizar, cancelar ou reabrir.';
  end if;

  select r.* into occurrence from cali_workspace.account_records r
  where r.id = p_record_id and r.visibility = 'client'
    and cali_workspace.partner_can_access(r.company_id, 'records')
  for no key update;
  if not found then
    raise exception using errcode = '42501', message = 'Ocorrência indisponível para este acesso.';
  end if;
  if occurrence.workflow_status is null or occurrence.workflow_status in ('completed', 'cancelled') then
    raise exception using errcode = '23514', message = 'Esta ocorrência está encerrada. Só a Patricia pode reabrir.';
  end if;

  if occurrence.workflow_status is distinct from p_status then
    update cali_workspace.account_records
    set workflow_status = p_status, requires_action = (p_status = 'in_progress'),
      first_admin_opened_at = coalesce(first_admin_opened_at, now()), last_activity_at = now(), updated_at = now()
    where id = occurrence.id;

    label := case p_status when 'in_progress' then 'Em andamento' when 'waiting_client' then 'Aguardando cliente' else 'Stand by' end;
    perform cali_workspace.notify_workspace_movement(occurrence.company_id,auth.uid(),'client','record_status',
      'Atualização na sua solicitação','“' || occurrence.title || '” agora está como ' || label || '.',
      'account_record',occurrence.id,'/cliente/registros?record=' || occurrence.id::text,'normal',false);
  end if;
  return jsonb_build_object('record_id',occurrence.id,'workflow_status',p_status);
end;
$$;

notify pgrst, 'reload schema';
commit;
