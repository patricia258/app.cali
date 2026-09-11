-- Validade documental: revisão visível no cliente e alerta operacional 60 dias antes.
alter table cali_workspace.files add column if not exists valid_until date;
create index if not exists files_valid_until_idx on cali_workspace.files(company_id, valid_until) where valid_until is not null and status='published';

create or replace function cali_workspace.dispatch_document_validity_alerts_v1()
returns void language plpgsql security definer
set search_path=cali_workspace,public,net,pg_catalog
as $$
declare v_hook text; v_file record; v_profile record; v_notification uuid;
begin
  select secret_value into v_hook from cali_workspace.runtime_secrets where secret_key='notification_email_hook';
  for v_file in
    select f.id,f.company_id,f.title,f.valid_until,c.display_name
    from cali_workspace.files f join cali_workspace.companies c on c.id=f.company_id
    where f.status='published' and f.client_visible=true and f.valid_until is not null
      and f.valid_until between current_date and current_date + 60
  loop
    for v_profile in select p.id from cali_workspace.profiles p where p.company_id=v_file.company_id and p.role='client' and p.active=true
    loop
      if not exists (select 1 from cali_workspace.notifications n where n.user_id=v_profile.id and n.entity_type='file' and n.entity_id=v_file.id and n.notification_type='document_validity_review' and n.created_at::date=current_date) then
        insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
        values(v_file.company_id,v_profile.id,'document_validity_review','Revisão documental próxima','A validade de “'||v_file.title||'” se aproxima em '||to_char(v_file.valid_until,'DD/MM/YYYY')||'. Planeje a revisão para manter a documentação vigente e reduzir risco trabalhista e passivo em auditorias.','file',v_file.id,'/cliente/documentos','high',true)
        returning id into v_notification;
        if v_hook is not null then perform net.http_post(url:='https://kqtbfeeqbcllwvlkbrkq.supabase.co/functions/v1/workspace-notification-email-hook',headers:=jsonb_build_object('Content-Type','application/json','x-workspace-hook',v_hook),body:=jsonb_build_object('notification_id',v_notification)); end if;
      end if;
    end loop;
  end loop;
end; $$;
grant execute on function cali_workspace.dispatch_document_validity_alerts_v1() to service_role;
do $$ declare v_jobid bigint; begin select jobid into v_jobid from cron.job where jobname='workspace-document-validity-alerts'; if v_jobid is not null then perform cron.unschedule(v_jobid); end if; exception when undefined_table then null; end $$;
select cron.schedule('workspace-document-validity-alerts','15 11 * * *',$cron$select cali_workspace.dispatch_document_validity_alerts_v1();$cron$);
