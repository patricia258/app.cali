-- Evitar sobreposição de orçamento sobre preço tabelado já aceito pelo cliente.
-- Sem alterações de schema, interface, notificações ou orçamentos legados pendentes.

CREATE OR REPLACE FUNCTION cali_workspace.admin_quote_online_extra_v1(p_request_id uuid, p_amount_cents integer, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'auth', 'cali_workspace'
AS $function$
declare v_req cali_workspace.scheduling_requests%rowtype;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso não autorizado.'; end if;
  if p_amount_cents<=0 or p_amount_cents>100000000 or length(btrim(coalesce(p_note,'')))<5 then raise exception 'Informe um valor e as condições do orçamento.'; end if;
  select * into v_req from cali_workspace.scheduling_requests where id=p_request_id and online_extra_requested for update;
  if not found or v_req.status not in ('submitted','client_review') then raise exception 'Pedido indisponível para orçamento.'; end if;
  -- Proteger a tabela e o aceite registrados na solicitação nova.
  -- Não modificar orçamentos legados que ainda aguardam a decisão do cliente.
  if v_req.online_extra_request_ack_name is not null
     and v_req.online_extra_quote_accepted_at is not null
     and v_req.online_extra_quote_cents in (20000,30000) then
    raise exception 'Este pedido online extra já tem valor fixo aceito. Não é necessário emitir outro orçamento.';
  end if;
  update cali_workspace.scheduling_requests set online_extra_quote_cents=p_amount_cents,online_extra_quote_accepted_at=null,
    billing_notice='Orçamento para reunião online extra: R$ '||to_char(p_amount_cents/100.0,'FM999G999G990D00')||'. '||btrim(p_note) where id=p_request_id;
  insert into cali_workspace.notifications(company_id,user_id,notification_type,title,body,entity_type,entity_id,action_url,relevance,email_required)
  values(v_req.company_id,v_req.requested_by,'scheduling_response','Orçamento da sua reunião online extra',
    'A CALI informou o valor e as condições. Consulte e aceite antes da confirmação da reunião.',
    'scheduling_request',p_request_id,'/cliente/cronograma','high',true);
  insert into cali_workspace.activity_log(company_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(v_req.company_id,auth.uid(),'online_extra_quoted','scheduling_request',p_request_id,jsonb_build_object('amount_cents',p_amount_cents,'note',btrim(p_note)));
end $function$
;
