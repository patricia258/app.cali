-- Perfil Comportamental CALI — método cali-disc-v1.1 (parecer de 23/10/2026, decisão da proprietária).
-- 1) Margem de leitura: diferença entre estilos só é real acima de 10 pontos; perfil misto quando os dois maiores
--    estilos ficam a menos de 10 pontos (antes: 5). Recalcula o campo nos resultados já gravados.
-- 2) Base de comparação interna: total de respostas e distribuição do estilo predominante (só a partir de 30 respostas).
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.cali_profile_submit(text,text,text,text,text,jsonb,boolean)'::regprocedure);
  v_def := replace(v_def, '(v_p1 - v_p2) < 5', '(v_p1 - v_p2) < 10');
  v_def := replace(v_def, '''cali-disc-v1''', '''cali-disc-v1.1''');
  execute v_def;
end $$;

update cali_workspace.profile_results
   set mixed = ((scores->'natural'->primary_style->>'pct')::int - (scores->'natural'->secondary_style->>'pct')::int) < 10,
       method_version = 'cali-disc-v1.1'
 where method_version = 'cali-disc-v1';

create or replace function public.cali_profile_base()
returns jsonb language sql stable security definer set search_path = pg_catalog, cali_workspace as $$
  select jsonb_build_object(
    'n', count(*),
    'min', 30,
    'by_primary', case when count(*) >= 30 then jsonb_build_object(
      'D', count(*) filter (where primary_style = 'D'), 'I', count(*) filter (where primary_style = 'I'),
      'S', count(*) filter (where primary_style = 'S'), 'C', count(*) filter (where primary_style = 'C')) end)
  from cali_workspace.profile_results;
$$;
revoke all on function public.cali_profile_base() from public;
grant execute on function public.cali_profile_base() to anon, authenticated;
