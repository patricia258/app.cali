create or replace function cali_workspace.edit_hour_entry_with_audit(
  p_entry_id uuid,
  p_work_date date,
  p_minutes integer,
  p_description text,
  p_category text,
  p_client_visible boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','auth','cali_workspace'
as $$
declare
  v_old cali_workspace.hour_entries%rowtype;
  v_new cali_workspace.hour_entries%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'admin access required'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Informe a justificativa da edição.' using errcode='22023'; end if;
  if coalesce(p_minutes,0) <= 0 or p_minutes > 1440 then raise exception 'Informe uma duração entre 1 e 1440 minutos.' using errcode='22023'; end if;
  if nullif(trim(coalesce(p_description,'')),'') is null then raise exception 'A descrição do lançamento é obrigatória.' using errcode='22023'; end if;

  select * into v_old from cali_workspace.hour_entries where id=p_entry_id for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;

  update cali_workspace.hour_entries
     set work_date=coalesce(p_work_date,work_date),
         minutes=p_minutes,
         description=trim(p_description),
         category=coalesce(nullif(trim(coalesce(p_category,'')),''),category,'Outros'),
         client_visible=coalesce(p_client_visible,false),
         updated_at=now()
   where id=p_entry_id
   returning * into v_new;

  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_old.company_id,auth.uid(),'hours_entry_edited','hour_entry',p_entry_id,
    jsonb_build_object('reason',trim(p_reason),'source_type',v_old.source_type,'before',to_jsonb(v_old),'after',to_jsonb(v_new)));
  return jsonb_build_object('id',p_entry_id,'updated_at',v_new.updated_at);
end;
$$;

create or replace function cali_workspace.delete_hour_entry_with_audit(p_entry_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','auth','cali_workspace'
as $$
declare v_old cali_workspace.hour_entries%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'admin access required'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Informe o motivo da exclusão.' using errcode='22023'; end if;
  select * into v_old from cali_workspace.hour_entries where id=p_entry_id for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_old.company_id,auth.uid(),'hours_entry_deleted','hour_entry',p_entry_id,
    jsonb_build_object('reason',trim(p_reason),'source_type',v_old.source_type,'deleted_entry',to_jsonb(v_old)));
  delete from cali_workspace.hour_entries where id=p_entry_id;
  return jsonb_build_object('id',p_entry_id,'deleted_at',now());
end;
$$;

create or replace function cali_workspace.get_hour_entry_audit(p_limit integer default 100)
returns table(id bigint,company_id uuid,actor_user_id uuid,event_type text,entity_id uuid,metadata jsonb,created_at timestamptz)
language plpgsql
security definer
set search_path to 'pg_catalog','auth','cali_workspace'
as $$
begin
  if not cali_workspace.is_admin() then raise exception 'admin access required'; end if;
  return query
  select a.id,a.company_id,a.actor_user_id,a.event_type,a.entity_id,a.metadata,a.created_at
  from cali_workspace.activity_log a
  where a.entity_type='hour_entry' and a.event_type in ('hours_entry_edited','hours_entry_deleted')
  order by a.created_at desc
  limit greatest(1,least(coalesce(p_limit,100),500));
end;
$$;

revoke all on function cali_workspace.edit_hour_entry_with_audit(uuid,date,integer,text,text,boolean,text) from public;
revoke all on function cali_workspace.delete_hour_entry_with_audit(uuid,text) from public;
revoke all on function cali_workspace.get_hour_entry_audit(integer) from public;
grant execute on function cali_workspace.edit_hour_entry_with_audit(uuid,date,integer,text,text,boolean,text) to authenticated;
grant execute on function cali_workspace.delete_hour_entry_with_audit(uuid,text) to authenticated;
grant execute on function cali_workspace.get_hour_entry_audit(integer) to authenticated;
