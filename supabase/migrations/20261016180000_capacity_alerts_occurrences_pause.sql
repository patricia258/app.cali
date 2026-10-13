-- Política de capacidade mensal, fase 2 (documento e decisões da proprietária em 2026-10-13):
--  * avisos automáticos de 75% e 100%, uma vez por marco / cliente / mês, consolidados quando um lançamento cruza os dois;
--  * ocorrências de excedente por mês, contadas dentro da vigência do pacote (Partner 8 meses, Full 12; demais 6);
--  * 3ª ocorrência => pendência administrativa "Avaliar adequação de capacidade";
--  * tolerância de 10%: ao chegar a 110% o sistema AVISA a administradora e ELA decide pausar até o mês seguinte.
--    Nada é automático contra o cliente: sem cobrança, sem suspensão automática, sem mudança de contrato.
-- Só acréscimo. O gatilho nunca impede um lançamento de horas (qualquer falha é ignorada).

create table if not exists cali_workspace.capacity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  month date not null,
  kind text not null check (kind in ('m75', 'm100', 'excess', 'tolerance', 'review')),
  percent numeric,
  contracted_minutes integer,
  used_minutes integer,
  occurrence_number integer,
  notified boolean not null default false,
  recipients integer not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, month, kind)
);
create table if not exists cali_workspace.capacity_pauses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  month date not null,
  paused_by uuid references auth.users(id) on delete set null,
  paused_at timestamptz not null default now(),
  note text,
  resumed_at timestamptz,
  resumed_by uuid references auth.users(id) on delete set null,
  unique (company_id, month)
);
alter table cali_workspace.capacity_events enable row level security;
alter table cali_workspace.capacity_pauses enable row level security;
drop policy if exists capacity_events_admin_all on cali_workspace.capacity_events;
create policy capacity_events_admin_all on cali_workspace.capacity_events for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
drop policy if exists capacity_pauses_admin_all on cali_workspace.capacity_pauses;
create policy capacity_pauses_admin_all on cali_workspace.capacity_pauses for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
grant select, insert, update, delete on cali_workspace.capacity_events, cali_workspace.capacity_pauses to authenticated;

-- Vigência mínima do pacote = janela em que as ocorrências de excedente são contadas.
create or replace function cali_workspace.capacity_window_months(p_company_id uuid)
returns integer language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select case lower(coalesce((select service_plan from cali_workspace.companies where id = p_company_id), '')) when 'partner' then 8 when 'full' then 12 else 6 end;
$$;

-- Números de um mês: mesma regra da tela do cliente (todo o tempo conta; projetos operacionais).
create or replace function cali_workspace.capacity_month(p_company_id uuid, p_month date)
returns table (contracted_minutes integer, used_minutes integer)
language sql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
  select round(coalesce((select s.contracted_hours from cali_workspace.service_cycles s where s.company_id = p_company_id and date_trunc('month', s.reference_month)::date = date_trunc('month', p_month)::date order by s.created_at desc limit 1),
                        (select c.monthly_hours_contracted from cali_workspace.companies c where c.id = p_company_id), 0) * 60)::integer,
         coalesce((select sum(h.minutes) from cali_workspace.hour_entries h where h.company_id = p_company_id and h.work_date >= date_trunc('month', p_month)::date
                    and h.work_date < (date_trunc('month', p_month) + interval '1 month')::date and cali_workspace.hour_project_operational(h.project_id)), 0)::integer;
$$;

-- Quantos meses com excedente CONFIRMADO (recalculado dos lançamentos reais) dentro da janela, incluindo o mês informado.
create or replace function cali_workspace.capacity_excess_months(p_company_id uuid, p_month date)
returns integer language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_count integer := 0; v_m date; v_c integer; v_u integer; i integer;
begin
  for i in 0 .. cali_workspace.capacity_window_months(p_company_id) - 1 loop
    v_m := (date_trunc('month', p_month) - make_interval(months => i))::date;
    select contracted_minutes, used_minutes into v_c, v_u from cali_workspace.capacity_month(p_company_id, v_m);
    if coalesce(v_c, 0) > 0 and v_u > v_c then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

create or replace function cali_workspace.evaluate_capacity(p_company_id uuid, p_month date, p_notify boolean default true)
returns void language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_month date := date_trunc('month', p_month)::date; v_c integer; v_u integer; v_pct numeric; v_occ integer; v_new text[] := '{}'; v_kind text; v_rows integer;
        v_title text; v_body text; v_name text; v_label text := to_char(v_month, 'MM/YYYY'); v_recipients integer := 0;
begin
  select contracted_minutes, used_minutes into v_c, v_u from cali_workspace.capacity_month(p_company_id, v_month);
  if coalesce(v_c, 0) <= 0 then return; end if;
  v_pct := round((v_u::numeric / v_c) * 100, 1);
  v_occ := case when v_u > v_c then cali_workspace.capacity_excess_months(p_company_id, v_month) else 0 end;
  foreach v_kind in array array['m75', 'm100', 'excess', 'tolerance', 'review'] loop
    if (v_kind = 'm75' and v_pct >= 75) or (v_kind = 'm100' and v_pct >= 100) or (v_kind = 'excess' and v_u > v_c) or (v_kind = 'tolerance' and v_pct >= 110) or (v_kind = 'review' and v_occ >= 3) then
      insert into cali_workspace.capacity_events (company_id, month, kind, percent, contracted_minutes, used_minutes, occurrence_number, notified)
      values (p_company_id, v_month, v_kind, v_pct, v_c, v_u, case when v_kind in ('excess', 'review') then v_occ else null end, p_notify)
      on conflict (company_id, month, kind) do nothing;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then v_new := v_new || v_kind; end if;
    end if;
  end loop;
  if not p_notify or array_length(v_new, 1) is null then return; end if;
  select display_name into v_name from cali_workspace.companies where id = p_company_id;

  -- Cliente: UMA comunicação, a do marco mais alto recém-atingido.
  if 'excess' = any(v_new) then
    v_title := case when v_occ >= 3 then 'Capacidade mensal: terceira ocorrência de excedente' when v_occ = 2 then 'Capacidade mensal: nova ocorrência de excedente' else 'Capacidade mensal ultrapassada' end;
    v_body := case when v_occ >= 3 then 'O consumo de horas ultrapassou a capacidade contratada pela terceira vez no período acompanhado. Esse histórico indica que a demanda pode estar acima da capacidade inicialmente planejada. Vamos avaliar juntos a adequação do pacote, as prioridades e as alternativas disponíveis.'
                   when v_occ = 2 then 'Identificamos uma nova ocorrência de consumo acima da capacidade mensal. Essa recorrência pode indicar a necessidade de revermos o volume de horas previsto para a operação. A CALI acompanhará o cenário e poderá propor um ajuste de planejamento.'
                   else 'Neste mês, a utilização ultrapassou a capacidade contratada. Vamos acompanhar a evolução das demandas e, se necessário, reorganizar as prioridades para manter o planejamento alinhado à necessidade da empresa.' end;
  elsif 'm100' = any(v_new) then
    v_title := 'Capacidade integralmente utilizada';
    v_body := 'A capacidade mensal contratada foi integralmente utilizada. A CALI acompanhará as demandas previstas e alinhará com você as prioridades, necessidades adicionais e próximos encaminhamentos.';
  elsif 'm75' = any(v_new) then
    v_title := 'Atenção ao consumo';
    v_body := 'A sua empresa já utilizou 75% da capacidade contratada para este mês. Ainda temos atividades previstas e, se necessário, podemos revisar juntos a ordem de prioridades.';
  end if;
  if v_title is not null then
    insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
    select p_company_id, p.id, 'capacity_alert', v_title, v_body, 'company', p_company_id, '/cliente/horas', 'high', true
      from cali_workspace.profiles p where p.company_id = p_company_id and p.role = 'client' and p.active;
    get diagnostics v_recipients = row_count;
    update cali_workspace.capacity_events set recipients = v_recipients where company_id = p_company_id and month = v_month and kind = any(v_new);
  end if;

  -- Administradora: um aviso por rodada, com tudo o que foi atingido; pendências em destaque.
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select p_company_id, p.id, 'capacity_alert',
         case when 'review' = any(v_new) then 'Avaliar adequação de capacidade · ' || coalesce(v_name, 'cliente')
              when 'tolerance' = any(v_new) then 'Limite de tolerância atingido · ' || coalesce(v_name, 'cliente')
              when 'excess' = any(v_new) then 'Excedente de horas · ' || coalesce(v_name, 'cliente')
              when 'm100' = any(v_new) then 'Capacidade 100% utilizada · ' || coalesce(v_name, 'cliente')
              else 'Capacidade em 75% · ' || coalesce(v_name, 'cliente') end,
         left(coalesce(v_name, 'Cliente') || ' está em ' || replace(v_pct::text, '.', ',') || '% da capacidade de ' || v_label || ' (' || (v_u / 60) || 'h' || lpad((v_u % 60)::text, 2, '0') || ' de ' || (v_c / 60) || 'h).'
           || case when v_occ > 0 then ' Ocorrência de excedente nº ' || v_occ || ' na vigência do pacote.' else '' end
           || case when 'review' = any(v_new) then ' Terceira ocorrência: avalie a adequação do pacote.' else '' end
           || case when 'tolerance' = any(v_new) then ' Passou de 110%: decida em Horas se pausa as atividades até o próximo mês.' else '' end
           || case when v_title is not null then ' O cliente foi avisado.' else '' end, 400),
         'company', p_company_id, '/admin/horas', case when v_new && array['review', 'tolerance', 'excess'] then 'high' else 'normal' end, false
    from cali_workspace.profiles p where p.role = 'admin' and p.active;
end;
$$;

create or replace function cali_workspace.hour_entries_capacity_check()
returns trigger language plpgsql security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
begin
  begin
    if tg_op in ('INSERT', 'UPDATE') then perform cali_workspace.evaluate_capacity(new.company_id, new.work_date, true); end if;
  exception when others then null; end;
  return null;
end;
$$;
drop trigger if exists hour_entries_capacity_check on cali_workspace.hour_entries;
create trigger hour_entries_capacity_check after insert or update of minutes, work_date, company_id, project_id on cali_workspace.hour_entries
  for each row execute function cali_workspace.hour_entries_capacity_check();

-- Situação do mês para o cliente (ocorrência e pausa), sem expor nada interno.
create or replace function cali_workspace.get_client_capacity_status(p_month date)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog', 'cali_workspace' as $$
declare v_company uuid := cali_workspace.current_company_id(); v_month date := date_trunc('month', p_month)::date; v_c integer; v_u integer;
begin
  if v_company is null then raise exception 'Empresa vinculada não encontrada.' using errcode = '42501'; end if;
  select contracted_minutes, used_minutes into v_c, v_u from cali_workspace.capacity_month(v_company, v_month);
  return jsonb_build_object(
    'occurrence', case when coalesce(v_c, 0) > 0 and v_u > v_c then cali_workspace.capacity_excess_months(v_company, v_month) else 0 end,
    'windowMonths', cali_workspace.capacity_window_months(v_company),
    'paused', exists (select 1 from cali_workspace.capacity_pauses where company_id = v_company and month = v_month and resumed_at is null));
end;
$$;

-- Painel da administradora: todas as empresas no mês.
create or replace function cali_workspace.admin_capacity_overview(p_month date)
returns table (company_id uuid, contracted_minutes integer, used_minutes integer, excess_months integer, window_months integer, paused boolean, events text[])
language plpgsql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare v_month date := date_trunc('month', p_month)::date;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso restrito à administradora' using errcode = '42501'; end if;
  return query
  select c.id, m.contracted_minutes, m.used_minutes, cali_workspace.capacity_excess_months(c.id, v_month), cali_workspace.capacity_window_months(c.id),
         exists (select 1 from cali_workspace.capacity_pauses p where p.company_id = c.id and p.month = v_month and p.resumed_at is null),
         coalesce((select array_agg(e.kind order by e.created_at) from cali_workspace.capacity_events e where e.company_id = c.id and e.month = v_month and e.notified), '{}')
    from cali_workspace.companies c cross join lateral cali_workspace.capacity_month(c.id, v_month) m
   where c.status <> 'archived';
end;
$$;

revoke all on function cali_workspace.capacity_window_months(uuid) from public, anon, authenticated;
revoke all on function cali_workspace.capacity_month(uuid, date) from public, anon, authenticated;
revoke all on function cali_workspace.capacity_excess_months(uuid, date) from public, anon, authenticated;
revoke all on function cali_workspace.evaluate_capacity(uuid, date, boolean) from public, anon, authenticated;
revoke all on function cali_workspace.get_client_capacity_status(date) from public, anon;
revoke all on function cali_workspace.admin_capacity_overview(date) from public, anon;
grant execute on function cali_workspace.get_client_capacity_status(date) to authenticated;
grant execute on function cali_workspace.admin_capacity_overview(date) to authenticated;

-- Histórico: registra em silêncio (sem avisar ninguém) os marcos que JÁ estavam atingidos no mês atual, para a implantação
-- não disparar avisos retroativos. Meses anteriores não recebem marcos; contam só para a recorrência, recalculada dos lançamentos.
do $$
declare c record;
begin
  for c in select id from cali_workspace.companies where status <> 'archived' loop
    perform cali_workspace.evaluate_capacity(c.id, current_date, false);
  end loop;
end $$;
