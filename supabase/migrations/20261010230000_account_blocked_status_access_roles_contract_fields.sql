-- 2026-10-10 · autorizado pela proprietária ("pode aplicar").
-- 1) Situação "Bloqueado" separada de "Pausado":
--    paused  = contrato em espera; o cliente continua entrando e consultando.
--    blocked = o cliente não consegue entrar (perfis desativados pelo app).
alter table cali_workspace.companies drop constraint companies_status_check;
alter table cali_workspace.companies add constraint companies_status_check
  check (status = any (array['active','paused','blocked','closed','archived']));
alter table cali_workspace.companies
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

-- 2) Campos do cadastro aprovado que não existiam.
alter table cali_workspace.companies
  add column if not exists contract_type text,
  add column if not exists contract_model text,
  add column if not exists payment_term_days smallint check (payment_term_days is null or payment_term_days between 0 and 365),
  add column if not exists document_notes text,
  add column if not exists document_owner text;

-- 3) Decisores e acessos: papel da pessoa e limite de 4 acessos por empresa.
--    Todos os acessos têm a mesma visão; o papel é apenas informativo.
--    Um convite não libera acesso sozinho: a criação do acesso continua sendo feita pela CALI.
alter table cali_workspace.client_invites
  add column if not exists access_role text not null default 'additional'
    check (access_role = any (array['primary','decision_maker','additional'])),
  add column if not exists platform_access boolean not null default true;
update cali_workspace.client_invites set access_role = 'primary' where is_primary and access_role <> 'primary';

create or replace function cali_workspace.enforce_client_invite_limit()
returns trigger language plpgsql set search_path = cali_workspace, pg_temp as $$
begin
  if new.active and (
    select count(*) from cali_workspace.client_invites i
    where i.company_id = new.company_id and i.active and i.id <> new.id
  ) >= 4 then
    raise exception 'Cada empresa pode ter até 4 acessos.';
  end if;
  return new;
end $$;
drop trigger if exists client_invites_limit on cali_workspace.client_invites;
create trigger client_invites_limit before insert or update of active, company_id on cali_workspace.client_invites
  for each row execute function cali_workspace.enforce_client_invite_limit();
