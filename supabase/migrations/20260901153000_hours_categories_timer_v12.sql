-- CALI Workspace · Horas V12
-- O timer precisa preservar a mesma categoria/contexto que será gravada em hour_entries.

alter table cali_workspace.work_timers
  add column if not exists cycle_id uuid null references cali_workspace.service_cycles(id) on delete set null,
  add column if not exists category text null,
  add column if not exists description text null,
  add column if not exists client_visible boolean not null default false;

create index if not exists work_timers_cycle_idx on cali_workspace.work_timers(cycle_id) where cycle_id is not null;

comment on column cali_workspace.work_timers.category is 'Categoria executiva das horas, preservada ao encerrar o timer.';
comment on column cali_workspace.work_timers.description is 'Contexto do trabalho em andamento antes de virar hour_entry.';
comment on column cali_workspace.work_timers.client_visible is 'Define se o lançamento final pode ser exibido ao cliente.';
