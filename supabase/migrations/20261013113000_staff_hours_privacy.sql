-- Perfil Partner — horas: ele vê o consumo de cada empresa, mas NÃO os lançamentos da administradora
-- (regra da proprietária em 2026-10-13: "ele não vai ver o quanto eu trabalhei naquela ação, mas eu vejo dele").
-- Ajusta apenas a política criada para o Partner na etapa 2 (hour_entries_partner_read) e acrescenta uma função de resumo.
drop policy if exists hour_entries_partner_read on cali_workspace.hour_entries;
create policy hour_entries_partner_read on cali_workspace.hour_entries for select to authenticated
  using ((select cali_workspace.is_partner()) and created_by = (select auth.uid()) and cali_workspace.partner_can_access(company_id, 'hours'));

-- Consumo do mês por empresa atribuída (só o total; sem detalhar quem lançou).
create or replace function cali_workspace.partner_hours_summary(p_month date default date_trunc('month', current_date)::date)
returns table (company_id uuid, minutes bigint)
language sql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
  select h.company_id, coalesce(sum(h.minutes), 0)::bigint
  from cali_workspace.hour_entries h
  where cali_workspace.partner_can_access(h.company_id, 'hours')
    and h.work_date >= date_trunc('month', p_month)::date
    and h.work_date < (date_trunc('month', p_month) + interval '1 month')::date
  group by h.company_id;
$$;
revoke all on function cali_workspace.partner_hours_summary(date) from public, anon;
grant execute on function cali_workspace.partner_hours_summary(date) to authenticated;
