-- Optional client request attachment, private by company and by request.
create table if not exists cali_workspace.extra_visit_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references cali_workspace.scheduling_requests(id) on delete restrict,
  company_id uuid not null references cali_workspace.companies(id),
  storage_path text not null unique,
  file_name text not null,
  created_by uuid not null references cali_workspace.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists extra_visit_request_attachments_request_idx on cali_workspace.extra_visit_request_attachments(request_id);
alter table cali_workspace.extra_visit_request_attachments enable row level security;
drop policy if exists extra_visit_request_attachments_read on cali_workspace.extra_visit_request_attachments;
create policy extra_visit_request_attachments_read on cali_workspace.extra_visit_request_attachments
  for select to authenticated using (cali_workspace.is_admin() or company_id=cali_workspace.current_company_id());
grant select on cali_workspace.extra_visit_request_attachments to authenticated;
drop policy if exists extra_visit_requests_client_upload on storage.objects;
create policy extra_visit_requests_client_upload on storage.objects
  for insert to authenticated with check (
    bucket_id='cali-workspace-private' and split_part(name,'/',1)='extra-visit-requests'
    and split_part(name,'/',2)=cali_workspace.current_company_id()::text
    and exists(select 1 from cali_workspace.scheduling_requests r where r.id::text=split_part(name,'/',3)
      and r.company_id=cali_workspace.current_company_id() and r.requested_by=auth.uid() and r.extra_visit)
  );
drop policy if exists extra_visit_requests_read on storage.objects;
create policy extra_visit_requests_read on storage.objects
  for select to authenticated using (
    bucket_id='cali-workspace-private' and split_part(name,'/',1)='extra-visit-requests'
    and (cali_workspace.is_admin() or split_part(name,'/',2)=cali_workspace.current_company_id()::text)
  );
drop policy if exists extra_visit_requests_client_delete on storage.objects;
create policy extra_visit_requests_client_delete on storage.objects
  for delete to authenticated using (
    bucket_id='cali-workspace-private' and split_part(name,'/',1)='extra-visit-requests'
    and split_part(name,'/',2)=cali_workspace.current_company_id()::text and owner_id=auth.uid()::text
  );
create or replace function cali_workspace.attach_extra_visit_request_v1(p_request_id uuid,p_path text,p_name text)
returns uuid language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace,storage as $$
declare v_company uuid; v_id uuid;
begin
  select company_id into v_company from cali_workspace.scheduling_requests
    where id=p_request_id and extra_visit and requested_by=auth.uid();
  if not found or v_company<>cali_workspace.current_company_id() then raise exception 'Pedido não encontrado.'; end if;
  if p_path not like 'extra-visit-requests/'||v_company::text||'/'||p_request_id::text||'/%'
     or length(btrim(p_name))<1 or length(p_name)>240
     or not exists(select 1 from storage.objects where bucket_id='cali-workspace-private' and name=p_path)
     or exists(select 1 from cali_workspace.extra_visit_request_attachments where request_id=p_request_id) then
    raise exception 'Anexo inválido ou já vinculado.';
  end if;
  insert into cali_workspace.extra_visit_request_attachments(request_id,company_id,storage_path,file_name,created_by)
  values(p_request_id,v_company,p_path,btrim(p_name),auth.uid()) returning id into v_id;
  return v_id;
end $$;
grant execute on function cali_workspace.attach_extra_visit_request_v1(uuid,text,text) to authenticated;

-- Expenses are recorded together with a visible protocol; evidence is optional.
alter table cali_workspace.extra_visit_expenses alter column receipt_path drop not null;
alter table cali_workspace.extra_visit_expenses drop constraint if exists extra_visit_expenses_expense_kind_check;
alter table cali_workspace.extra_visit_expenses drop constraint if exists extra_visit_expenses_kind_check;
alter table cali_workspace.extra_visit_expenses add constraint extra_visit_expenses_kind_check
  check(expense_kind in ('transport','parking','food','extra_hours'));
alter table cali_workspace.extra_visit_expenses add column if not exists hours_quantity numeric(4,1);
alter table cali_workspace.extra_visit_expenses add column if not exists approved_quote_note text;
alter table cali_workspace.extra_visit_expenses add column if not exists protocol text;
update cali_workspace.extra_visit_expenses set protocol='CALI-DESP-'||to_char(created_at at time zone 'America/Sao_Paulo','YYYY')||'-'||upper(substr(replace(id::text,'-',''),1,8)) where protocol is null;
create unique index if not exists extra_visit_expenses_protocol_idx on cali_workspace.extra_visit_expenses(protocol);
create or replace function cali_workspace.admin_record_extra_visit_expenses_v2(p_request_id uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace,storage as $$
declare v_req record; v_item jsonb; v_kind text; v_amount integer; v_path text; v_note text; v_hours numeric; v_approval text; v_id uuid; v_protocol text; v_result jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from cali_workspace.profiles where id=auth.uid() and active and role='admin') then raise exception 'Acesso não autorizado.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit;
  if not found or v_req.status<>'completed' or not exists(select 1 from cali_workspace.event_outcomes where event_id=v_req.confirmed_event_id and outcome='occurred') then raise exception 'Registre primeiro a realização da visita.'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>12 then raise exception 'Adicione entre 1 e 12 linhas.'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_kind:=v_item->>'kind'; v_amount:=(v_item->>'amountCents')::integer; v_path:=nullif(btrim(v_item->>'receiptPath'),'');
    v_note:=btrim(coalesce(v_item->>'note','')); v_hours:=nullif(v_item->>'hoursQuantity','')::numeric; v_approval:=btrim(coalesce(v_item->>'approvedQuoteNote',''));
    if v_kind not in ('transport','parking','food','extra_hours') or v_amount is null or v_amount<=0 then raise exception 'Revise o tipo e o valor de cada linha.'; end if;
    if v_kind='extra_hours' and (v_hours is null or v_hours<=0 or length(v_approval)<5) then raise exception 'Horas adicionais exigem quantidade e registro do orçamento aprovado.'; end if;
    if v_path is not null and (v_path not like 'extra-visits/'||v_req.company_id::text||'/'||v_req.id::text||'/%'
      or not exists(select 1 from storage.objects where bucket_id='cali-workspace-private' and name=v_path)) then raise exception 'Comprovante não corresponde à visita.'; end if;
    v_id:=gen_random_uuid(); v_protocol:='CALI-DESP-'||to_char(now() at time zone 'America/Sao_Paulo','YYYY')||'-'||upper(substr(replace(v_id::text,'-',''),1,8));
    insert into cali_workspace.extra_visit_expenses(id,request_id,company_id,expense_kind,amount_cents,receipt_path,note,created_by,hours_quantity,approved_quote_note,protocol)
    values(v_id,p_request_id,v_req.company_id,v_kind,v_amount,v_path,v_note,auth.uid(),case when v_kind='extra_hours' then v_hours else null end,case when v_kind='extra_hours' then v_approval else null end,v_protocol);
    insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(v_req.company_id,auth.uid(),'extra_visit_expense_recorded','scheduling_request',p_request_id,jsonb_build_object('expense_id',v_id,'protocol',v_protocol,'kind',v_kind,'amount_cents',v_amount,'receipt_path',v_path));
    v_result:=v_result||jsonb_build_array(jsonb_build_object('id',v_id,'protocol',v_protocol));
  end loop;
  return v_result;
end $$;
grant execute on function cali_workspace.admin_record_extra_visit_expenses_v2(uuid,jsonb) to authenticated;
revoke execute on function cali_workspace.attach_extra_visit_request_v1(uuid,text,text) from public, anon;
revoke execute on function cali_workspace.admin_record_extra_visit_expenses_v2(uuid,jsonb) from public, anon;
