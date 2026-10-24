-- Perfil Comportamental CALI — relatório de gestão (especificação "Relatorio-Gestao_Especificacao_v1", 23/10/2026).
-- Terceiro relatório, para CEO/sócio/diretoria do cliente: só leitura agregada do grupo (nunca nomes nem escores por pessoa).
-- Personalização por link (ciclo): momento da empresa, setor (vocabulário) e resultado que a empresa persegue.
-- Liberação independente: a CALI libera para o cliente (depois da devolutiva); o cliente da empresa do link passa a ver.

alter table cali_workspace.profile_links
  add column if not exists gestao_moment text,
  add column if not exists gestao_sector text,
  add column if not exists gestao_goal text,
  add column if not exists gestao_released_at timestamptz;

-- Leitura agregada do link. Administradora sempre; cliente só da própria empresa e depois da liberação.
-- Abaixo de 5 respostas devolve só a contagem (proteção de quem respondeu).
create or replace function cali_workspace.profile_gestao(p_link uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_link cali_workspace.profile_links%rowtype; v_company text; v_meta jsonb; v_inv jsonb; v_dist jsonb; v_n integer;
begin
  select * into v_link from cali_workspace.profile_links where id = p_link;
  if not found then return null; end if;
  if not (cali_workspace.is_admin() or (v_link.gestao_released_at is not null and v_link.company_id is not null and v_link.company_id = cali_workspace.current_company_id())) then
    return null;
  end if;
  select display_name into v_company from cali_workspace.companies where id = v_link.company_id;

  select count(*) into v_n from (select distinct lower(email) from cali_workspace.profile_results where link_id = p_link) x;

  select jsonb_build_object(
           'sent', count(*) filter (where sent_at is not null),
           'completed', count(*) filter (where completed_at is not null),
           'declined', count(*) filter (where declined_at is not null and completed_at is null),
           'started', count(*) filter (where started_at is not null),
           'expired', count(*) filter (where sent_at is not null and completed_at is null and declined_at is null and deadline_at < now()),
           'median_minutes', percentile_cont(0.5) within group (order by extract(epoch from (completed_at - started_at)) / 60) filter (where completed_at is not null and started_at is not null))
    into v_inv from cali_workspace.profile_invites where link_id = p_link;

  select jsonb_build_object('min', min(created_at), 'max', max(created_at), 'method', max(method_version))
    into v_meta from cali_workspace.profile_results where link_id = p_link;

  if v_n >= 5 then
    with latest as (
      select distinct on (lower(email)) * from cali_workspace.profile_results where link_id = p_link order by lower(email), created_at desc
    ), styles(s) as (values ('D'), ('I'), ('S'), ('C')),
    changes as (
      select l.id, count(*) filter (where abs((l.scores->'adaptation'->>st.s)::int) >= 25) as changed
        from latest l cross join styles st group by l.id
    )
    select jsonb_build_object(
      'primary', (select jsonb_object_agg(st.s, (select count(*) from latest where primary_style = st.s)) from styles st),
      'secondary', (select jsonb_object_agg(st.s, (select count(*) from latest where secondary_style = st.s)) from styles st),
      'mixed', (select count(*) from latest where mixed),
      'bands', (select jsonb_object_agg(st.s, jsonb_build_object(
                  'low', (select count(*) from latest where (scores->'natural'->st.s->>'pct')::int < 40),
                  'mid', (select count(*) from latest where (scores->'natural'->st.s->>'pct')::int between 40 and 59),
                  'high', (select count(*) from latest where (scores->'natural'->st.s->>'pct')::int >= 60))) from styles st),
      'pressure', jsonb_build_object(
                  'stable', (select count(*) from changes where changed = 0),
                  'one', (select count(*) from changes where changed = 1),
                  'many', (select count(*) from changes where changed >= 2),
                  'up', (select jsonb_object_agg(st.s, (select count(*) from latest where (scores->'adaptation'->>st.s)::int >= 25)) from styles st),
                  'down', (select jsonb_object_agg(st.s, (select count(*) from latest where (scores->'adaptation'->>st.s)::int <= -25)) from styles st)))
      into v_dist;
  end if;

  return jsonb_build_object(
    'link_id', v_link.id, 'title', v_link.title, 'company', coalesce(v_company, v_link.company_label), 'purpose', v_link.purpose,
    'moment', v_link.gestao_moment, 'sector', v_link.gestao_sector, 'goal', v_link.gestao_goal, 'released_at', v_link.gestao_released_at,
    'n', v_n, 'invites', v_inv, 'dates', v_meta, 'dist', v_dist);
end $$;
revoke all on function cali_workspace.profile_gestao(uuid) from public, anon;
grant execute on function cali_workspace.profile_gestao(uuid) to authenticated;

-- Cliente: relatórios de gestão liberados para a própria empresa.
create or replace function cali_workspace.profile_gestao_list()
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'released_at', gestao_released_at) order by gestao_released_at desc), '[]'::jsonb)
    from cali_workspace.profile_links
   where gestao_released_at is not null and company_id is not null and company_id = cali_workspace.current_company_id();
$$;
revoke all on function cali_workspace.profile_gestao_list() from public, anon;
grant execute on function cali_workspace.profile_gestao_list() to authenticated;
