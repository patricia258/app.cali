-- Expense evidence is separate from the fixed visit fee. No invoice is issued here.
create table cali_workspace.extra_visit_expenses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references cali_workspace.scheduling_requests(id) on delete restrict,
  company_id uuid not null references cali_workspace.companies(id),
  expense_kind text not null check (expense_kind in ('transport','parking','food')),
  amount_cents integer not null check (amount_cents > 0),
  receipt_path text not null,
  note text,
  created_by uuid not null references cali_workspace.profiles(id),
  created_at timestamptz not null default now()
);
create index extra_visit_expenses_request_idx on cali_workspace.extra_visit_expenses(request_id);
alter table cali_workspace.extra_visit_expenses enable row level security;
create policy extra_visit_expenses_admin_read on cali_workspace.extra_visit_expenses for select to authenticated using (cali_workspace.is_admin());
create policy extra_visit_expenses_client_read on cali_workspace.extra_visit_expenses for select to authenticated using (company_id=cali_workspace.current_company_id());
grant select on cali_workspace.extra_visit_expenses to authenticated;

create policy cali_workspace_private_client_extra_visits_select on storage.objects
  for select to authenticated using (bucket_id='cali-workspace-private' and split_part(name,'/',1)='extra-visits'
    and split_part(name,'/',2)=cali_workspace.current_company_id()::text);

create or replace function cali_workspace.admin_record_extra_visit_expense_v1(
  p_request_id uuid,p_kind text,p_amount_cents integer,p_receipt_path text,p_note text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace,storage as $$
declare v_req record; v_id uuid;
begin
  if not exists(select 1 from cali_workspace.profiles where id=auth.uid() and active and role='admin') then raise exception 'Acesso não autorizado.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit;
  if not found or v_req.status <> 'completed' or not exists
    (select 1 from cali_workspace.event_outcomes where event_id=v_req.confirmed_event_id and outcome='occurred') then
    raise exception 'Registre primeiro a realização da visita.';
  end if;
  if p_kind not in ('transport','parking','food') or p_amount_cents <= 0 then raise exception 'Despesa inválida.'; end if;
  if p_receipt_path is null or split_part(p_receipt_path,'/',1)<>'extra-visits' or split_part(p_receipt_path,'/',2)<>v_req.company_id::text or
    split_part(p_receipt_path,'/',3)<>v_req.id::text or not exists
      (select 1 from storage.objects where bucket_id='cali-workspace-private' and name=p_receipt_path) then
    raise exception 'Anexe o comprovante à visita correta.';
  end if;
  insert into cali_workspace.extra_visit_expenses(request_id,company_id,expense_kind,amount_cents,receipt_path,note,created_by)
  values(p_request_id,v_req.company_id,p_kind,p_amount_cents,p_receipt_path,btrim(coalesce(p_note,'')),auth.uid()) returning id into v_id;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'extra_visit_expense_recorded','scheduling_request',p_request_id,
    jsonb_build_object('expense_id',v_id,'kind',p_kind,'amount_cents',p_amount_cents,'receipt_path',p_receipt_path));
  return jsonb_build_object('id',v_id,'status','recorded');
end $$;
grant execute on function cali_workspace.admin_record_extra_visit_expense_v1(uuid,text,integer,text,text) to authenticated;
