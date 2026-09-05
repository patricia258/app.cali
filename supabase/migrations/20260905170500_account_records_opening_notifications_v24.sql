-- CALI Workspace · garante notificação para qualquer solicitação criada pelo cliente
-- que tenha escapado do fluxo conversacional sem workflow_status.

create or replace function cali_workspace.notify_client_account_record_opened()
returns trigger
language plpgsql
security definer
set search_path=cali_workspace,public
as $$
declare
  v_client_name text;
  v_notification_ids uuid[];
begin
  -- Conversas que já nasceram com workflow_status são notificadas pelo RPC de mensagem.
  -- Este gatilho cobre qualquer solicitação criada pelo cliente que tenha escapado sem workflow.
  if new.source_actor <> 'client' or new.visibility <> 'client' or new.workflow_status is not null then
    return new;
  end if;

  update cali_workspace.account_records
     set workflow_status='open',
         requires_action=true,
         last_activity_at=coalesce(new.last_activity_at,now()),
         updated_at=now()
   where id=new.id;

  if nullif(btrim(coalesce(new.summary,'')),'') is not null
     and not exists (
       select 1 from cali_workspace.account_record_messages m
       where m.record_id=new.id and m.deleted_at is null
     ) then
    insert into cali_workspace.account_record_messages(
      record_id,company_id,author_id,author_role,body,visibility,created_at
    ) values (
      new.id,new.company_id,new.created_by,'client',btrim(new.summary),'client',coalesce(new.created_at,now())
    );
  end if;

  select coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.email),''),'Cliente')
    into v_client_name
    from cali_workspace.profiles p
   where p.id=new.created_by;

  v_notification_ids:=cali_workspace.notify_workspace_movement(
    new.company_id,
    new.created_by,
    'admin',
    'record_opened',
    'Nova solicitação do cliente',
    coalesce(v_client_name,'Cliente') || ' abriu “' || new.title || '”.',
    'account_record',
    new.id,
    '/admin/registros?record=' || new.id::text,
    'high',
    true
  );

  return new;
end;
$$;

drop trigger if exists account_records_client_opening_notifications on cali_workspace.account_records;
create trigger account_records_client_opening_notifications
after insert on cali_workspace.account_records
for each row execute function cali_workspace.notify_client_account_record_opened();

-- Recupera registros já criados pelo cliente que ficaram sem workflow antes deste ajuste,
-- sem disparar e-mails retroativos em massa.
update cali_workspace.account_records r
   set workflow_status='open',
       requires_action=true,
       last_activity_at=coalesce(r.last_activity_at,r.updated_at,r.created_at,now()),
       updated_at=now()
 where r.source_actor='client'
   and r.visibility='client'
   and r.workflow_status is null;

insert into cali_workspace.account_record_messages(
  record_id,company_id,author_id,author_role,body,visibility,created_at
)
select r.id,r.company_id,r.created_by,'client',btrim(r.summary),'client',r.created_at
  from cali_workspace.account_records r
 where r.source_actor='client'
   and r.visibility='client'
   and r.workflow_status='open'
   and nullif(btrim(coalesce(r.summary,'')),'') is not null
   and not exists (
     select 1 from cali_workspace.account_record_messages m
      where m.record_id=r.id and m.deleted_at is null
   );