-- CALI Workspace · evita dupla contagem de prazo por interrupcoes sobrepostas V45
create or replace function cali_workspace.guard_project_lifecycle_overlap_v45()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','cali_workspace'
as $$
declare
  v_front_id uuid;
begin
  if new.action not in ('pause','suspend') then return new; end if;

  if new.scope_type='project' then
    if exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=new.project_id and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'Existe uma interrupcao ativa neste projeto. Retome-a antes de criar outra pausa ou suspensao.';
    end if;
  elsif new.scope_type='front' then
    if exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=new.project_id and e.scope_type='project' and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'O projeto inteiro ja esta interrompido. Retome-o antes de interromper uma frente.';
    end if;
    if exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=new.project_id and e.scope_type='front' and e.scope_id=new.scope_id and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'Esta frente ja possui uma interrupcao ativa.';
    end if;
    if exists(select 1 from cali_workspace.project_lifecycle_events e join cali_workspace.deliverables d on d.id=e.scope_id where e.project_id=new.project_id and e.scope_type='deliverable' and d.workstream_id=new.scope_id and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'Ha um entregavel desta frente ja interrompido. Retome-o antes de interromper a frente inteira.';
    end if;
  else
    select d.workstream_id into v_front_id from cali_workspace.deliverables d where d.id=new.scope_id and d.project_id=new.project_id;
    if exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=new.project_id and e.scope_type='project' and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'O projeto inteiro ja esta interrompido. Retome-o antes de interromper um entregavel.';
    end if;
    if v_front_id is not null and exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=new.project_id and e.scope_type='front' and e.scope_id=v_front_id and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'A frente deste entregavel ja esta interrompida. Retome-a antes de interromper o entregavel isoladamente.';
    end if;
    if exists(select 1 from cali_workspace.project_lifecycle_events e where e.project_id=new.project_id and e.scope_type='deliverable' and e.scope_id=new.scope_id and e.action in ('pause','suspend') and e.resolved_at is null) then
      raise exception 'Este entregavel ja possui uma interrupcao ativa.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists project_lifecycle_overlap_guard_v45 on cali_workspace.project_lifecycle_events;
create trigger project_lifecycle_overlap_guard_v45
before insert on cali_workspace.project_lifecycle_events
for each row execute function cali_workspace.guard_project_lifecycle_overlap_v45();
