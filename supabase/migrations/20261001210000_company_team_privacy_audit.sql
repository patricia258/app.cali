-- Retrato ilustrado derivado da escolha declarada, sem expor a resposta textual na tabela.
alter table cali_workspace.team_members add column if not exists avatar_style text not null default 'neutral'
  check (avatar_style in ('female','male','neutral'));

create table if not exists cali_workspace.team_private_audit (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references cali_workspace.team_members(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  changed_fields text[] not null,
  created_at timestamptz not null default now()
);
create index if not exists team_private_audit_company_idx on cali_workspace.team_private_audit(company_id,created_at desc);
alter table cali_workspace.team_private_audit enable row level security;
grant select on cali_workspace.team_private_audit to authenticated;
revoke insert,update,delete on cali_workspace.team_private_audit from authenticated;
create policy team_private_audit_admin_read on cali_workspace.team_private_audit for select to authenticated using (cali_workspace.is_admin());

create or replace function cali_workspace.team_private_record_change()
returns trigger language plpgsql security definer
set search_path=pg_catalog,cali_workspace,auth
as $$
declare changed text[]:=array[]::text[];
begin
  if tg_op='INSERT' then changed:=array['salary','gender','has_children'];
  else
    if old.salary is distinct from new.salary then changed:=array_append(changed,'salary'); end if;
    if old.gender is distinct from new.gender or old.gender_detail is distinct from new.gender_detail then changed:=array_append(changed,'gender'); end if;
    if old.has_children is distinct from new.has_children then changed:=array_append(changed,'has_children'); end if;
  end if;
  if array_length(changed,1) is not null then
    insert into cali_workspace.team_private_audit(member_id,company_id,actor_user_id,changed_fields)
    values(new.member_id,new.company_id,auth.uid(),changed);
  end if;
  if 'gender'=any(changed) then
    update cali_workspace.team_members set avatar_style=case when new.gender in ('female','male') then new.gender else 'neutral' end where id=new.member_id and company_id=new.company_id;
  end if;
  return new;
end; $$;
revoke all on function cali_workspace.team_private_record_change() from public;
drop trigger if exists team_private_record_change_trigger on cali_workspace.team_member_private;
create trigger team_private_record_change_trigger after insert or update on cali_workspace.team_member_private
for each row execute function cali_workspace.team_private_record_change();
