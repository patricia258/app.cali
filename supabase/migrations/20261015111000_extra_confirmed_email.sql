-- CALI Workspace: email de confirmacao dos atendimentos extras
-- Disparo centralizado ao mudar status para confirmed, sem mudar regras de agendamento.
-- O antigo aviso ao cliente via admin_confirm_extra_visit_v1 seria duplicado;
-- sua substituicao mantem evento, historico e convidados.
CREATE OR REPLACE FUNCTION cali_workspace.admin_confirm_extra_visit_v1(p_request_id uuid, p_slot_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'auth', 'cali_workspace'
AS $function$
declare v_req record; v_client record; v_slot jsonb; v_start timestamptz; v_end timestamptz; v_event uuid;
begin
  if not exists(select 1 from cali_workspace.profiles where id=auth.uid() and active and role='admin') then raise exception 'Acesso não autorizado.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and extra_visit for update;
  if not found or v_req.status not in ('submitted','reschedule_review') or p_slot_index not between 0 and 1 then raise exception 'Pedido indisponível para confirmação.'; end if;
  v_slot := v_req.requested_slots->p_slot_index; v_start := (v_slot->>'startsAt')::timestamptz; v_end := (v_slot->>'endsAt')::timestamptz;
  if v_start <= now() then raise exception 'A data proposta já passou.'; end if;
  if exists(select 1 from cali_workspace.events where company_id=v_req.company_id and starts_at<v_end and ends_at>v_start and event_type='meeting' and source_type='scheduling_request') then raise exception 'Já existe um compromisso neste horário.'; end if;
  select id,full_name,email into v_client from cali_workspace.profiles where id=v_req.requested_by;
  insert into cali_workspace.events(company_id,title,event_type,starts_at,ends_at,mode,location,description,visibility,timezone,source_type,source_entity_id,sync_status,created_by,schedule_class,billing_applies,billing_reason)
  values(v_req.company_id,v_req.title,'meeting',v_start,v_end,'in_person',v_req.location,nullif(v_req.purpose,''),'client','America/Sao_Paulo','scheduling_request',v_req.id,'pending',auth.uid(),'extra',true,'Visita extra R$ 800,00 / 4h; despesas comprovadas à parte; cobrança após realização') returning id into v_event;
  insert into cali_workspace.event_attendees(event_id,company_id,user_id,name,email,attendee_type,status)
  values(v_event,v_req.company_id,v_client.id,coalesce(v_client.full_name,'Cliente'),v_client.email,'client','pending');
  update cali_workspace.scheduling_requests set selected_slot=v_slot,status='confirmed',confirmed_event_id=v_event,
    meeting_entitlement='extra',contract_session_number=null,billable_extra=true,
    extra_visit_billing_period=date_trunc('month',(v_start at time zone 'America/Sao_Paulo'))::date where id=p_request_id;
  -- O email e a notificacao do cliente sao emitidos ao confirmar o pedido (trigger centralizado).
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'scheduling_request_confirmed','scheduling_request',p_request_id,jsonb_build_object('event_id',v_event,'selected_slot',v_slot,'extra_visit',true,'fee_cents',80000));
  return jsonb_build_object('status','confirmed','event_id',v_event);
end $function$
;
-- A confirmação ocorre por múltiplos caminhos: CALI confirma diretamente
-- ou cliente aceita data alternativa. Um disparo central captura ambos.
CREATE OR REPLACE FUNCTION cali_workspace.notify_confirmed_extra_request_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'cali_workspace' AS $$
DECLARE v_title text; v_minutes integer;
BEGIN
  IF NEW.status <> 'confirmed' OR OLD.status IS NOT DISTINCT FROM 'confirmed'
     OR NEW.confirmed_event_id IS NULL OR NEW.requested_by IS NULL THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.extra_visit,false) AND coalesce(NEW.online_extra_requested,false) THEN
    RETURN NEW; -- Não bloquear a confirmação por problema no e-mail.
  END IF;
  IF NEW.extra_visit IS TRUE THEN
    IF NEW.extra_visit_fee_cents IS DISTINCT FROM 80000 THEN
      RETURN NEW;
    END IF;
    v_title := 'Visita presencial extra confirmada';
  ELSIF NEW.online_extra_requested IS TRUE THEN
    v_minutes := round(extract(epoch from (
      (NEW.selected_slot->>'endsAt')::timestamptz -
      (NEW.selected_slot->>'startsAt')::timestamptz
    )) / 60)::integer;
    IF v_minutes IS NULL OR v_minutes NOT IN (60, 90) OR NEW.online_extra_quote_accepted_at IS NULL
       OR NEW.online_extra_quote_cents IS DISTINCT FROM
          (CASE WHEN v_minutes=60 THEN 20000 ELSE 30000 END) THEN
      RETURN NEW; -- Fluxos legados permanecem funcionando.
    END IF;
    v_title := 'Reunião online extra confirmada';
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO cali_workspace.notifications
   (company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  SELECT NEW.company_id,NEW.requested_by,'scheduling_extra_confirmed',v_title,
    'Seu atendimento extra está confirmado. Confira a data na agenda.',
    'scheduling_request',NEW.id,'/cliente/cronograma','high',true
  WHERE NOT EXISTS (
    SELECT 1 FROM cali_workspace.notifications n
    WHERE n.user_id=NEW.requested_by
      AND n.entity_type='scheduling_request' AND n.entity_id=NEW.id
      AND n.notification_type='scheduling_extra_confirmed'
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS scheduling_notify_confirmed_extra_v1 ON cali_workspace.scheduling_requests;
CREATE TRIGGER scheduling_notify_confirmed_extra_v1
AFTER UPDATE OF status ON cali_workspace.scheduling_requests
FOR EACH ROW WHEN (NEW.status='confirmed' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION cali_workspace.notify_confirmed_extra_request_v1();
