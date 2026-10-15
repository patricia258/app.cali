-- Apenas cancelamentos de visita presencial EXTRA visível ao cliente enviam e-mail.
-- Reutiliza a notificação existente calendar_update; sem notificação duplicada,
-- sem alterar agendamento ou cobrança. E-mails são preenchidos com dados do evento.
CREATE OR REPLACE FUNCTION cali_workspace.notify_event_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cali_workspace', 'public'
AS $function$
declare v_attendee record; v_title text; v_body text; begin
  if old.title is not distinct from new.title and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at and old.cancelled_at is not distinct from new.cancelled_at then return new; end if;
  if new.cancelled_at is not null and old.cancelled_at is distinct from new.cancelled_at then v_title:='Evento cancelado'; v_body:='“' || new.title || '” foi cancelado.'; else v_title:='Evento atualizado'; v_body:='“' || new.title || '” teve uma atualização de agenda.'; end if;
  for v_attendee in select distinct ea.user_id from cali_workspace.event_attendees ea where ea.event_id=new.id and ea.user_id is not null and ea.user_id is distinct from auth.uid() loop
    insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    values(new.company_id,v_attendee.user_id,'calendar_update',v_title,v_body,'event',new.id,'/cliente/cronograma',case when new.cancelled_at is not null then 'high' else 'normal' end,
      (new.cancelled_at is not null
       and old.cancelled_at is distinct from new.cancelled_at
       and new.schedule_class='extra'
       and new.mode='in_person'
       and new.visibility='client'
       and new.source_type='scheduling_request'
       and exists (
         select 1 from cali_workspace.profiles p
         where p.id=v_attendee.user_id and p.role='client' and p.active=true
       ))
    );
  end loop;
  return new;
end;
$function$
;
