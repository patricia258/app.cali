begin;
set local lock_timeout = '5s';


alter policy "CALI admin manages proposals" on public.cali_proposals
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "CALI admin reads activity" on public.cali_activity
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "CALI admin reads pricing" on public.cali_pricing_rules
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "CALI admin updates pricing" on public.cali_pricing_rules
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "CALI admin reads submissions" on public.cali_submissions
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "CALI admin updates submissions" on public.cali_submissions
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "Administradora CALI pode ler respostas" on public.mapa_respostas
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

alter policy "Administradora CALI pode revisar respostas" on public.mapa_respostas
  using ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2())) with check ((select cali_workspace.is_admin()) and (select cali_workspace.workspace_private_access_v2()));

CREATE OR REPLACE FUNCTION public.workspace_mapa_people_journeys() RETURNS SETOF public.mapa_sessoes_resumo
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501', message='Acesso administrativo necessário.';
  end if;

  return query
  select * from public.mapa_sessoes_resumo
  order by accessed_at desc;
end;
$$;

CREATE OR REPLACE FUNCTION public.workspace_mapa_people_record(p_protocolo text) RETURNS public.mapa_respostas
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
declare
  result public.mapa_respostas;
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501', message='Acesso administrativo necessário.';
  end if;

  select * into result
  from public.mapa_respostas
  where protocolo = p_protocolo
  order by created_at desc
  limit 1;

  if result.id is null then
    raise exception 'Resposta do Mapa não encontrada';
  end if;

  return result;
end;
$$;

CREATE OR REPLACE FUNCTION public.workspace_mapa_people_records() RETURNS SETOF public.mapa_respostas
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501', message='Acesso administrativo necessário.';
  end if;

  return query
  select * from public.mapa_respostas
  order by created_at desc;
end;
$$;

CREATE OR REPLACE FUNCTION public.workspace_update_mapa_people_record(p_id uuid, p_status text DEFAULT NULL::text, p_observacoes jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
declare
  updated public.mapa_respostas;
begin
  if cali_workspace.workspace_private_access_v2() is not true or cali_workspace.is_admin() is not true then
    raise exception using errcode='42501', message='Acesso administrativo necessário.';
  end if;

  update public.mapa_respostas
     set status = coalesce(p_status, status),
         observacoes = coalesce(p_observacoes, observacoes)
   where id = p_id
   returning * into updated;

  if updated.id is null then
    raise exception 'Resposta do Mapa não encontrada';
  end if;

  return to_jsonb(updated);
end;
$$;

notify pgrst, 'reload schema';
commit;
