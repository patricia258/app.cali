-- Executar somente em cópia descartável do dump legado, antes das migrations da branch.
-- IDs e e-mails sintéticos. As tabelas auxiliares guardam a preimagem para upgrade-after.sql.
\set ON_ERROR_STOP on
begin;

do $$
begin
  if to_regclass('cali_upgrade_probe.expected_rows') is not null then
    raise exception 'O ensaio de upgrade já contém fixtures.';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'cali_workspace'
    and table_name = 'deliverables' and column_name = 'review_revision') then
    raise exception 'O ensaio precisa começar no schema legado, antes das migrations novas.';
  end if;
end $$;

create schema cali_upgrade_probe;
revoke all on schema cali_upgrade_probe from public;
create table cali_upgrade_probe.expected_rows (
  relation text not null,
  row_id uuid not null,
  original jsonb not null,
  ignored text[] not null default '{}',
  primary key(relation, row_id)
);
create table cali_upgrade_probe.expected_access (
  profile_id uuid primary key,
  allowed boolean not null,
  reason text not null
);

insert into auth.users(id, email, aud, role, created_at, updated_at, email_confirmed_at)
select ('a17e0000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  'upgrade-' || number || '@example.test', 'authenticated', 'authenticated', now(), now(), now()
from generate_series(1, 6) number;

insert into cali_workspace.companies(id, legal_name, display_name, status)
values
  ('a17e0000-0000-4000-8000-000000000101', 'Empresa sintética A', 'Upgrade A', 'active'),
  ('a17e0000-0000-4000-8000-000000000102', 'Empresa sintética B', 'Upgrade B', 'active');

insert into cali_workspace.profiles(id, company_id, email, full_name, role, active, is_primary)
select u.id,
  case when number in (1,2,4) then 'a17e0000-0000-4000-8000-000000000101'::uuid
    when number = 3 then 'a17e0000-0000-4000-8000-000000000102'::uuid end,
  u.email, 'Pessoa sintética ' || number,
  case when number in (5,6) then 'partner' else 'client' end, true, number in (1,3)
from generate_series(1,6) number join auth.users u
  on u.id = ('a17e0000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid;

-- Estes dois estados eram admitidos pelo resolvedor antigo, mas não constituem
-- autorização válida no contrato novo. O ensaio deve provar a recusa sem
-- alterar o convite, criar vínculo Auth ou esconder esses casos do preflight.
insert into cali_upgrade_probe.expected_access(profile_id,allowed,reason)
select p.id,number not in (4,6),case number
  when 4 then 'Controle negativo: convite sem acesso à plataforma'
  when 6 then 'Controle negativo: Partner sem vínculo Auth comprovado'
  else 'Acesso elegível anterior preservado' end
from generate_series(1,6) number join cali_workspace.profiles p
  on p.id = ('a17e0000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid;

-- Cliente 4 já entra pelo perfil ativo e possui convite ativo sem platform_access.
insert into cali_workspace.client_invites(id, company_id, email, full_name, active, platform_access, is_primary)
select ('a17e0000-0000-4000-8000-' || lpad((200+number)::text,12,'0'))::uuid,
  p.company_id, p.email, p.full_name, true, number <> 4, p.is_primary
from generate_series(1,4) number join cali_workspace.profiles p
  on p.id = ('a17e0000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid;

-- Partner 6 reproduz vínculo legado por e-mail, sem staff_members.user_id.
insert into cali_workspace.staff_members(id,email,full_name,active,user_id,modules)
select ('a17e0000-0000-4000-8000-' || lpad((300+number)::text,12,'0'))::uuid,
  p.email,p.full_name,true,case when number = 5 then p.id end,array['hours','projects','records']
from generate_series(5,6) number join cali_workspace.profiles p
  on p.id = ('a17e0000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid;
insert into cali_workspace.staff_company_assignments(staff_id,company_id)
values
  ('a17e0000-0000-4000-8000-000000000305','a17e0000-0000-4000-8000-000000000101'),
  ('a17e0000-0000-4000-8000-000000000305','a17e0000-0000-4000-8000-000000000102'),
  ('a17e0000-0000-4000-8000-000000000306','a17e0000-0000-4000-8000-000000000101');
create table cali_upgrade_probe.expected_assignments as
select staff_id,company_id,to_jsonb(a) as original from cali_workspace.staff_company_assignments a
where staff_id::text like 'a17e0000-%';

insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select ('a17e0000-0000-4000-8000-' || lpad((400+number)::text,12,'0'))::uuid,
  p.id,now()-interval '1 hour',now(),'aal1',now()+interval '1 day'
from generate_series(1,6) number join cali_workspace.profiles p
  on p.id = ('a17e0000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid;

insert into cali_workspace.projects(id,company_id,name)
values
  ('a17e0000-0000-4000-8000-000000000501','a17e0000-0000-4000-8000-000000000101','Projeto legado A'),
  ('a17e0000-0000-4000-8000-000000000502','a17e0000-0000-4000-8000-000000000102','Projeto legado B');
insert into cali_workspace.deliverables(id,company_id,project_id,title,status,approved_at,approval_requested_at)
values
  ('a17e0000-0000-4000-8000-000000000601','a17e0000-0000-4000-8000-000000000101',
    'a17e0000-0000-4000-8000-000000000501','Entregável legado A','approved',now()-interval '12 hours',now()-interval '18 hours'),
  ('a17e0000-0000-4000-8000-000000000602','a17e0000-0000-4000-8000-000000000102',
    'a17e0000-0000-4000-8000-000000000502','Entregável legado B','in_progress',null,null);
insert into cali_workspace.nps_responses(id,company_id,user_id,deliverable_id,score,comment,created_at)
values
  ('a17e0000-0000-4000-8000-000000000701','a17e0000-0000-4000-8000-000000000101',
    'a17e0000-0000-4000-8000-000000000001','a17e0000-0000-4000-8000-000000000601',5,'Histórico original A1',now()-interval '1 day'),
  ('a17e0000-0000-4000-8000-000000000702','a17e0000-0000-4000-8000-000000000101',
    'a17e0000-0000-4000-8000-000000000002','a17e0000-0000-4000-8000-000000000601',4,'Histórico original A2',now());
insert into cali_session_guard.phase4_delivery_corrections(
  company_id,delivery_id,opened_by,opened_at,reason,previous_approved_at,approved_by,approved_at,score,comment)
values ('a17e0000-0000-4000-8000-000000000101','a17e0000-0000-4000-8000-000000000601',
  'a17e0000-0000-4000-8000-000000000005',now()-interval '18 hours','Revisão aprovada no piloto',
  now()-interval '2 days','a17e0000-0000-4000-8000-000000000002',now()-interval '12 hours',3,'Ajuste histórico aprovado');
create table cali_upgrade_probe.expected_corrections as
select id as row_id,to_jsonb(c) as original from cali_session_guard.phase4_delivery_corrections c
where delivery_id='a17e0000-0000-4000-8000-000000000601';

insert into cali_workspace.account_records(id,company_id,project_id,title,visibility,workflow_status,closed_at)
values
  ('a17e0000-0000-4000-8000-000000000801','a17e0000-0000-4000-8000-000000000101',
    'a17e0000-0000-4000-8000-000000000501','Ocorrência legada A','client','completed',now()-interval '2 days'),
  ('a17e0000-0000-4000-8000-000000000802','a17e0000-0000-4000-8000-000000000102',
    'a17e0000-0000-4000-8000-000000000502','Ocorrência legada B','client','open',null);
insert into cali_workspace.account_record_messages(id,record_id,company_id,author_id,author_role,body)
values ('a17e0000-0000-4000-8000-000000000811','a17e0000-0000-4000-8000-000000000801',
  'a17e0000-0000-4000-8000-000000000101','a17e0000-0000-4000-8000-000000000001','client','Mensagem legada preservada');
insert into cali_workspace.account_record_feedback(id,record_id,company_id,user_id,score,comment,created_at)
values ('a17e0000-0000-4000-8000-000000000821','a17e0000-0000-4000-8000-000000000801',
  'a17e0000-0000-4000-8000-000000000101','a17e0000-0000-4000-8000-000000000001',5,'Feedback legado',now()-interval '1 day');

insert into cali_workspace.files(id,company_id,project_id,deliverable_id,title,storage_path,client_visible)
values
  ('a17e0000-0000-4000-8000-000000000901','a17e0000-0000-4000-8000-000000000101',
    'a17e0000-0000-4000-8000-000000000501','a17e0000-0000-4000-8000-000000000601','Arquivo legado A',
    'documents/a17e0000-0000-4000-8000-000000000101/legacy-a.pdf',true),
  ('a17e0000-0000-4000-8000-000000000902','a17e0000-0000-4000-8000-000000000102',
    'a17e0000-0000-4000-8000-000000000502','a17e0000-0000-4000-8000-000000000602','Arquivo legado B',
    'documents/a17e0000-0000-4000-8000-000000000102/legacy-b.pdf',true);
-- O dump schema-only não contém as linhas de configuração dos buckets.
insert into storage.buckets(id,name,public)
values ('cali-workspace-private','cali-workspace-private',false),('cali-forms','cali-forms',false)
on conflict(id) do nothing;
insert into storage.objects(id,bucket_id,name,owner_id)
select ('a17e0000-0000-4000-8000-' || lpad((910+number)::text,12,'0'))::uuid,
  'cali-workspace-private', f.storage_path,'a17e0000-0000-4000-8000-000000000001'
from generate_series(1,2) number join cali_workspace.files f
  on f.id = ('a17e0000-0000-4000-8000-' || lpad((900+number)::text,12,'0'))::uuid;

-- Formulário, anexo e resposta existem antes da migration de recibos. A chamada
-- usa exatamente os dois argumentos e o caminho __visited da interface antiga.
insert into cali_workspace.forms(id,slug,title,company_id,status,confirm_email,thank_you,questions)
values
  ('a17e0000-0000-4000-8000-000000001101','upgrade-form-a','Formulário legado A',
    'a17e0000-0000-4000-8000-000000000101','open',false,'Resposta legada recebida',
    '[{"id":"choice","label":"Escolha","kind":"single_choice","required":true,"logic":[{"when":"Sem arquivo","goTo":"__end"}]},{"id":"attachment","label":"Arquivo","kind":"file","required":true}]'),
  ('a17e0000-0000-4000-8000-000000001102','upgrade-form-b','Formulário legado B',
    'a17e0000-0000-4000-8000-000000000102','open',false,'Resposta vizinha recebida','[]');
insert into storage.objects(id,bucket_id,name,owner_id) values
  ('a17e0000-0000-4000-8000-000000001111','cali-forms','a17e0000-0000-4000-8000-000000001101/legacy.pdf',null),
  ('a17e0000-0000-4000-8000-000000001112','cali-forms','a17e0000-0000-4000-8000-000000001102/legacy.pdf',null);
set local role anon;
select public.cali_form_submit('upgrade-form-a',
  '{"choice":"Com arquivo","attachment":"a17e0000-0000-4000-8000-000000001101/legacy.pdf","__visited":["choice","attachment"]}');
reset role;

-- Dois timers simultâneos válidos no legado. O mais antigo deve virar recuperação, sem perder segundos.
insert into cali_workspace.work_timers(id,company_id,project_id,user_id,status,started_at,last_seen_at,description)
values
  ('a17e0000-0000-4000-8000-000000001001','a17e0000-0000-4000-8000-000000000102',
    'a17e0000-0000-4000-8000-000000000502','a17e0000-0000-4000-8000-000000000005','active',
    now()-interval '2 hours',now()-interval '1 hour','Timer legado sobreposto'),
  ('a17e0000-0000-4000-8000-000000001002','a17e0000-0000-4000-8000-000000000101',
    'a17e0000-0000-4000-8000-000000000501','a17e0000-0000-4000-8000-000000000005','active',
    now()-interval '20 minutes',now(),'Timer legado mantido');

do $$
declare
  relation text;
  ignored text[];
begin
  foreach relation in array array['auth.users','auth.sessions','cali_workspace.companies','cali_workspace.profiles',
    'cali_workspace.client_invites','cali_workspace.staff_members','cali_workspace.projects','cali_workspace.deliverables',
    'cali_workspace.nps_responses','cali_workspace.account_records','cali_workspace.account_record_messages',
    'cali_workspace.account_record_feedback','cali_workspace.files','storage.objects','cali_workspace.work_timers',
    'cali_workspace.forms']
  loop
    ignored := case relation
      when 'cali_workspace.work_timers' then array['status','stopped_at','paused_at','minutes']
      else '{}'::text[] end;
    execute format('insert into cali_upgrade_probe.expected_rows
      select %L,id,to_jsonb(t),%L::text[] from %s t where id::text like ''a17e0000-%%''',relation,ignored,relation);
  end loop;
end $$;

insert into cali_upgrade_probe.expected_rows(relation,row_id,original)
select 'cali_workspace.form_responses',r.id,to_jsonb(r) from cali_workspace.form_responses r
where r.form_id in ('a17e0000-0000-4000-8000-000000001101','a17e0000-0000-4000-8000-000000001102');

create table cali_upgrade_probe.expected_notifications as
select count(*) as count from cali_workspace.notifications where entity_type='nps_response';

-- Confirma que os casos problemáticos eram válidos para o resolvedor da Edge antiga.
do $$
begin
  if (select count(*) from cali_workspace.profiles p where p.id in (
    'a17e0000-0000-4000-8000-000000000004','a17e0000-0000-4000-8000-000000000006') and p.active) <> 2 then
    raise exception 'Fixtures de acesso legado inválidas.';
  end if;
end $$;
commit;
select relation,count(*) as original_rows from cali_upgrade_probe.expected_rows group by relation order by relation;
