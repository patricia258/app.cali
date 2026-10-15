-- CALI Workspace: avisar cliente quando visita presencial EXTRA confirmada é cancelada.
-- O e-mail informa possibilidade de multa de 20%, mas nunca a cobra automaticamente.
-- Não altera agenda, valores, avaliação de taxa ou avisos da administradora.
CREATE OR REPLACE FUNCTION cali_workspace.notify_cancelled_extra_visit_email_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','cali_workspace' AS $$
BEGIN
  IF OLD.status='confirmed' AND NEW.status='cancelled'
     AND NEW.extra_visit IS TRUE AND NEW.extra_visit_change_kind='cancel'
     AND NEW.extra_visit_change_was_confirmed IS TRUE
     AND NEW.extra_visit_previous_slot IS NOT NULL
     AND NEW.extra_visit_change_reason IS NOT NULL
     AND NEW.requested_by IS NOT NULL THEN
    INSERT INTO cali_workspace.notifications
      (company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
    VALUES
      (NEW.company_id,NEW.requested_by,'scheduling_extra_cancelled',
       'Visita extra cancelada',
       'A visita extra foi cancelada. Consulte o registro e as condições no Workspace.',
       'scheduling_request',NEW.id,'/cliente/cronograma','normal',true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER scheduling_notify_cancelled_extra_visit_v1
AFTER UPDATE OF status ON cali_workspace.scheduling_requests
FOR EACH ROW WHEN (OLD.status='confirmed' AND NEW.status='cancelled')
EXECUTE FUNCTION cali_workspace.notify_cancelled_extra_visit_email_v1();
