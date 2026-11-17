begin;
set local lock_timeout = '5s';

create function cali_session_guard.require_material_review_accepted(p_kind text, p_entity_id uuid)
returns void language plpgsql stable set search_path = '' as $$
begin
  if exists (select 1 from cali_workspace.partner_material_reviews
    where kind = p_kind and entity_id = p_entity_id and status <> 'accepted') then
    raise exception using errcode = '55000', message = 'Conclua a revisão do Partner antes de aprovar ou enviar.';
  end if;
end;
$$;

create function cali_session_guard.guard_material_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if tg_table_name = 'reports' and new.status in ('approved','sent','published') then
      perform cali_session_guard.require_material_review_accepted('report',new.id);
    elsif tg_table_name = 'cali_proposals' and new.status in ('aprovada','enviada') then
      perform cali_session_guard.require_material_review_accepted('proposal',new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_partner_report_approval before update of status on cali_workspace.reports
for each row execute function cali_session_guard.guard_material_approval();
create trigger guard_partner_proposal_approval before update of status on public.cali_proposals
for each row execute function cali_session_guard.guard_material_approval();

do $review$
declare
  assignment text := pg_get_functiondef('cali_workspace.assign_partner_material_review(text,uuid,uuid,uuid)'::regprocedure);
  reserve text := pg_get_functiondef('cali_workspace.reserve_material_email(uuid,text,uuid,uuid,text,uuid,integer)'::regprocedure);
  case_anchor text := $source$  case p_kind
  when 'report' then$source$;
  report_anchor text := $source$from cali_workspace.reports where id=p_entity_id and company_id=p_company_id and status in ('draft','review');$source$;
  proposal_anchor text := $source$where p.id=p_entity_id and p.status='rascunho' and s.archived_at is null;$source$;
  mapa_anchor text := $source$from public.mapa_respostas where id=p_entity_id and lgpd_aceite and status <> 'enviado';$source$;
  reserve_anchor text := $source$  if p_kind = 'mapa' then
    perform cali_session_guard.lock_mapa_delivery(p_entity_id, p_version);$source$;
begin
  if strpos(assignment,case_anchor) = 0 or strpos(assignment,report_anchor) = 0
    or strpos(assignment,proposal_anchor) = 0 or strpos(assignment,mapa_anchor) = 0
    or strpos(reserve,reserve_anchor) = 0 then
    raise exception 'O contrato de revisão de materiais diverge do catálogo reconciliado.';
  end if;
  assignment := replace(assignment,case_anchor,$source$  perform 1 from cali_workspace.partner_material_reviews
  where kind=p_kind and entity_id=p_entity_id for update;

  case p_kind
  when 'report' then$source$);
  assignment := replace(assignment,report_anchor,rtrim(report_anchor,';') || ' for share;');
  assignment := replace(assignment,proposal_anchor,rtrim(proposal_anchor,';') || ' for share of p;');
  assignment := replace(assignment,mapa_anchor,$source$from public.mapa_respostas
    where id=p_entity_id and lgpd_aceite and status not in ('enviado','cancelado') for share;$source$);
  execute assignment;

  execute replace(reserve,reserve_anchor,$source$  if p_kind in ('report','proposal') then
    perform cali_session_guard.require_material_review_accepted(p_kind,p_entity_id);
  end if;
  if p_kind = 'mapa' then
    perform cali_session_guard.lock_mapa_delivery(p_entity_id, p_version);$source$);
end;
$review$;

alter function cali_session_guard.require_material_review_accepted(text,uuid) owner to postgres;
alter function cali_session_guard.guard_material_approval() owner to postgres;
revoke all on function cali_session_guard.require_material_review_accepted(text,uuid),
  cali_session_guard.guard_material_approval() from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
