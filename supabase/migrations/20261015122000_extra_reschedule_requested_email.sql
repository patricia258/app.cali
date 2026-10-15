-- Cliente: confirmação de recebimento do pedido de reagendamento de VISITA extra.
-- Somente quando uma visita confirmada foi retirada da agenda.
-- Não muda calendário, preços, avisos administrativos ou pedido original.
CREATE OR REPLACE FUNCTION cali_workspace.notify_extra_reschedule_requested_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','cali_workspace' AS $$
BEGIN
  IF NEW.extra_visit IS TRUE
     AND OLD.status='confirmed'
     AND NEW.status='reschedule_review'
     AND NEW.extra_visit_change_kind='reschedule'
     AND NEW.extra_visit_change_was_confirmed IS TRUE
     AND NEW.extra_visit_previous_slot IS NOT NULL
     AND NEW.extra_visit_change_reason IS NOT NULL
     AND NEW.requested_by IS NOT NULL THEN
    INSERT INTO cali_workspace.notifications
      (company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    VALUES
      (NEW.company_id,NEW.requested_by,'scheduling_extra_reschedule_requested',
       'Reagendamento da visita extra solicitado',
       'Recebemos suas novas opções de data e vamos conferir a disponibilidade.',
       'scheduling_request',NEW.id,'/cliente/cronograma','normal',true);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS scheduling_notify_extra_reschedule_requested_v1 ON cali_workspace.scheduling_requests;
CREATE TRIGGER scheduling_notify_extra_reschedule_requested_v1
AFTER UPDATE OF status ON cali_workspace.scheduling_requests
FOR EACH ROW WHEN (OLD.status='confirmed' AND NEW.status='reschedule_review')
EXECUTE FUNCTION cali_workspace.notify_extra_reschedule_requested_v1();
