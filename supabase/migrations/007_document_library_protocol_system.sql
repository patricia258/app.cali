create table if not exists cali_workspace.protocol_counters (
  entity_type text not null,
  protocol_year integer not null,
  last_value bigint not null default 0,
  primary key (entity_type, protocol_year)
);

create or replace function cali_workspace.generate_protocol(p_entity_type text)
returns text
language plpgsql
security definer
set search_path = cali_workspace, public
as $$
declare
  v_type text := upper(regexp_replace(coalesce(p_entity_type, 'OBJ'), '[^A-Za-z0-9]+', '', 'g'));
  v_year integer := extract(year from current_date)::integer;
  v_next bigint;
begin
  if v_type = '' then v_type := 'OBJ'; end if;

  insert into cali_workspace.protocol_counters(entity_type, protocol_year, last_value)
  values (v_type, v_year, 1)
  on conflict (entity_type, protocol_year)
  do update set last_value = cali_workspace.protocol_counters.last_value + 1
  returning last_value into v_next;

  return format('CALI-%s-%s-%s', v_type, v_year, lpad(v_next::text, 6, '0'));
end;
$$;

grant execute on function cali_workspace.generate_protocol(text) to authenticated;

alter table cali_workspace.files add column if not exists protocol text;
alter table cali_workspace.files add column if not exists document_kind text not null default 'other';
alter table cali_workspace.files add column if not exists cover_storage_path text;
alter table cali_workspace.files add column if not exists description text;

alter table cali_workspace.companies add column if not exists protocol text;
alter table cali_workspace.projects add column if not exists protocol text;
alter table cali_workspace.service_cycles add column if not exists protocol text;
alter table cali_workspace.deliverables add column if not exists protocol text;
alter table cali_workspace.events add column if not exists protocol text;
alter table cali_workspace.reports add column if not exists protocol text;
alter table cali_workspace.billing_records add column if not exists protocol text;
alter table cali_workspace.account_documents add column if not exists protocol text;

update cali_workspace.files set protocol = cali_workspace.generate_protocol('DOC') where protocol is null;
update cali_workspace.account_documents set protocol = cali_workspace.generate_protocol('DOC') where protocol is null;
update cali_workspace.companies set protocol = cali_workspace.generate_protocol('CLI') where protocol is null;
update cali_workspace.projects set protocol = cali_workspace.generate_protocol('PRJ') where protocol is null;
update cali_workspace.service_cycles set protocol = cali_workspace.generate_protocol('CYC') where protocol is null;
update cali_workspace.deliverables set protocol = cali_workspace.generate_protocol('DEL') where protocol is null;
update cali_workspace.events set protocol = cali_workspace.generate_protocol('EVT') where protocol is null;
update cali_workspace.reports set protocol = cali_workspace.generate_protocol('RPT') where protocol is null;
update cali_workspace.billing_records set protocol = cali_workspace.generate_protocol('FIN') where protocol is null;

alter table cali_workspace.files alter column protocol set default cali_workspace.generate_protocol('DOC');
alter table cali_workspace.account_documents alter column protocol set default cali_workspace.generate_protocol('DOC');
alter table cali_workspace.companies alter column protocol set default cali_workspace.generate_protocol('CLI');
alter table cali_workspace.projects alter column protocol set default cali_workspace.generate_protocol('PRJ');
alter table cali_workspace.service_cycles alter column protocol set default cali_workspace.generate_protocol('CYC');
alter table cali_workspace.deliverables alter column protocol set default cali_workspace.generate_protocol('DEL');
alter table cali_workspace.events alter column protocol set default cali_workspace.generate_protocol('EVT');
alter table cali_workspace.reports alter column protocol set default cali_workspace.generate_protocol('RPT');
alter table cali_workspace.billing_records alter column protocol set default cali_workspace.generate_protocol('FIN');

create unique index if not exists files_protocol_uidx on cali_workspace.files(protocol) where protocol is not null;
create unique index if not exists account_documents_protocol_uidx on cali_workspace.account_documents(protocol) where protocol is not null;
create unique index if not exists companies_protocol_uidx on cali_workspace.companies(protocol) where protocol is not null;
create unique index if not exists projects_protocol_uidx on cali_workspace.projects(protocol) where protocol is not null;
create unique index if not exists service_cycles_protocol_uidx on cali_workspace.service_cycles(protocol) where protocol is not null;
create unique index if not exists deliverables_protocol_uidx on cali_workspace.deliverables(protocol) where protocol is not null;
create unique index if not exists events_protocol_uidx on cali_workspace.events(protocol) where protocol is not null;
create unique index if not exists reports_protocol_uidx on cali_workspace.reports(protocol) where protocol is not null;
create unique index if not exists billing_records_protocol_uidx on cali_workspace.billing_records(protocol) where protocol is not null;
