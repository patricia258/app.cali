-- CALI Workspace · Horas · paridade funcional com Connect
-- Timer global com pausa/retomada e apenas um timer aberto por usuário.

alter table cali_workspace.work_timers
  add column if not exists paused_at timestamptz null,
  add column if not exists paused_seconds integer not null default 0;

alter table cali_workspace.work_timers
  drop constraint if exists work_timers_status_check;

alter table cali_workspace.work_timers
  add constraint work_timers_status_check
  check (status in ('active','paused','stopped','discarded'));

create unique index if not exists work_timers_one_open_per_user_idx
  on cali_workspace.work_timers(user_id)
  where status in ('active','paused');

comment on column cali_workspace.work_timers.paused_at is 'Momento da pausa atual do timer, quando status=paused.';
comment on column cali_workspace.work_timers.paused_seconds is 'Total acumulado de segundos pausados, excluído do consumo final.';
