-- Pati (28/09/2026): o nome digitado no "ciente" não pode bloquear o envio por não bater
-- exatamente com o nome cadastrado no perfil (abreviações, nomes compostos, etc. são normais).
-- Mantém a exigência de nome completo (mínimo 2 palavras, 5+ caracteres) e do checkbox,
-- mas remove a comparação exata com profiles.full_name.
create or replace function cali_workspace.create_extra_visit_request_v1(
  p_title text,p_purpose text,p_location text,p_requested_slots jsonb,p_ack_name text,p_acknowledged boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,auth,cali_workspace as $$
declare v_profile record; v_result jsonb; v_id uuid; v_notice text; v_ack_name text;
begin
  select id,full_name,role,active from cali_workspace.profiles where id=auth.uid() into v_profile;
  if not found or not v_profile.active or v_profile.role <> 'client' then raise exception 'Acesso não autorizado.'; end if;
  v_ack_name := btrim(regexp_replace(coalesce(p_ack_name,''),'\s+',' ','g'));
  if not p_acknowledged or length(v_ack_name) < 5 or position(' ' in v_ack_name) = 0 then
    raise exception 'Digite seu nome completo e confirme a ciência das condições.';
  end if;
  perform cali_workspace.check_extra_visit_slots_v1(p_requested_slots,48);
  v_notice := 'Visita extra: R$ 800,00 por até 4 horas. Acima de 4 horas, orçamento e aceite prévios. Deslocamento, estacionamento e alimentação necessária à parte, com comprovantes. Cancelamento/no-show sem aviso ou justificativa: taxa de 20% (R$ 160,00), após avaliação da CALI. Conciliação no período da visita.';
  v_result := cali_workspace.create_scheduling_request_v2('in_person',p_title,p_purpose,p_location,p_requested_slots,'regular',true);
  v_id := (v_result->>'id')::uuid;
  update cali_workspace.scheduling_requests set extra_visit=true,extra_visit_fee_cents=80000,
    extra_visit_ack_name=v_ack_name,extra_visit_terms_version='2026-09-28-v1',
    meeting_entitlement='extra',contract_session_number=null,billable_extra=true,
    billing_notice=v_notice,urgency_fee_applies=false,
    policy_snapshot=coalesce(policy_snapshot,'{}'::jsonb)||jsonb_build_object('extraVisit',true,'feeCents',80000,'durationMinutes',240,'cancellationPercent',20,'termsVersion','2026-09-28-v1')
    where id=v_id;
  return jsonb_build_object('id',v_id,'billable_extra',true,'fee_cents',80000);
end $$;
