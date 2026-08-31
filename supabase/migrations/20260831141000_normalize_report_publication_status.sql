-- CALI Workspace · Relatórios
-- Garante que published_at acompanhe semanticamente o status do relatório.

create or replace function cali_workspace.normalize_report_publication_status()
returns trigger
language plpgsql
set search_path = cali_workspace, public
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists reports_normalize_publication_status on cali_workspace.reports;
create trigger reports_normalize_publication_status
before insert or update of status, published_at
on cali_workspace.reports
for each row execute function cali_workspace.normalize_report_publication_status();
