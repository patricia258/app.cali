-- Capacidade mensal, fase 3: histórico mensal por empresa e registro da avaliação de adequação (análise, decisão, comunicação).
-- Só acréscimo; uso exclusivo da administradora. Nenhuma decisão aqui altera contrato, cobrança ou atendimento.
create table if not exists cali_workspace.capacity_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  month date not null,
  analysis text not null check (char_length(btrim(analysis)) between 3 and 4000),
  decision text not null check (decision in ('monitor', 'reprioritize', 'reschedule', 'complement', 'capacity_change')),
  communicated boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists capacity_reviews_company_idx on cali_workspace.capacity_reviews (company_id, created_at desc);
alter table cali_workspace.capacity_reviews enable row level security;
drop policy if exists capacity_reviews_admin_all on cali_workspace.capacity_reviews;
create policy capacity_reviews_admin_all on cali_workspace.capacity_reviews for all to authenticated using ((select cali_workspace.is_admin())) with check ((select cali_workspace.is_admin()));
grant select, insert, update, delete on cali_workspace.capacity_reviews to authenticated;

create or replace function cali_workspace.admin_capacity_history(p_company_id uuid, p_month date)
returns table (month date, contracted_minutes integer, used_minutes integer)
language plpgsql stable security definer set search_path to 'pg_catalog', 'auth', 'cali_workspace' as $$
declare i integer; v_m date;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso restrito à administradora' using errcode = '42501'; end if;
  for i in reverse cali_workspace.capacity_window_months(p_company_id) - 1 .. 0 loop
    v_m := (date_trunc('month', p_month) - make_interval(months => i))::date;
    return query select v_m, m.contracted_minutes, m.used_minutes from cali_workspace.capacity_month(p_company_id, v_m) m;
  end loop;
end;
$$;
revoke all on function cali_workspace.admin_capacity_history(uuid, date) from public, anon;
grant execute on function cali_workspace.admin_capacity_history(uuid, date) to authenticated;
