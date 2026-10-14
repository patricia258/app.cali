-- 1) Autorizado pela proprietária em 2026-10-14 ("pode fechar"): as quatro funções do Mapa People deixam de poder ser chamadas
--    por quem não está logado. Elas já recusavam quem não fosse a administradora; isto só tira a porta da rua.
revoke execute on function public.workspace_mapa_people_journeys() from public, anon;
revoke execute on function public.workspace_mapa_people_record(text) from public, anon;
revoke execute on function public.workspace_mapa_people_records() from public, anon;
revoke execute on function public.workspace_update_mapa_people_record(uuid, text, jsonb) from public, anon;
grant execute on function public.workspace_mapa_people_journeys() to authenticated;
grant execute on function public.workspace_mapa_people_record(text) to authenticated;
grant execute on function public.workspace_mapa_people_records() to authenticated;
grant execute on function public.workspace_update_mapa_people_record(uuid, text, jsonb) to authenticated;

-- 2) Pedido da proprietária em 2026-10-14: o prazo de resposta do cliente é de 72 HORAS corridas, não 3 dias úteis.
--    Troca só a linha que calcula o vencimento da validação do cronograma em duas funções existentes:
--    de "3 dias úteis, às 18h" para "agora + (dias do projeto x 24 horas)". Com o padrão 3, dá 72 horas.
do $$
declare v_def text; v_old_new text := $s$v_due:=((cali_workspace.add_business_days(current_date,coalesce(new.client_response_business_days,3))::timestamp+time '18:00') at time zone 'America/Sao_Paulo');$s$;
        v_old_proj text := $s$v_due:=((cali_workspace.add_business_days(current_date,coalesce(v_project.client_response_business_days,3))::timestamp+time '18:00') at time zone 'America/Sao_Paulo');$s$;
begin
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cali_workspace' and p.proname = 'open_project_schedule_review_v38';
  if position(v_old_new in v_def) > 0 then execute replace(v_def, v_old_new, $s$v_due:=now()+make_interval(hours => 24*coalesce(new.client_response_business_days,3));$s$); end if;
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cali_workspace' and p.proname = 'admin_resolve_project_schedule_adjustment';
  if position(v_old_proj in v_def) > 0 then execute replace(v_def, v_old_proj, $s$v_due:=now()+make_interval(hours => 24*coalesce(v_project.client_response_business_days,3));$s$); end if;
end $$;
