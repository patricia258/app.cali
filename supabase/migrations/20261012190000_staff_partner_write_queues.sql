-- Perfil Partner — ETAPA 3a (escrita, só por acréscimo). Autorizado pela proprietária em 2026-10-12 ("pode seguir para a próxima etapa").
-- Nenhuma função ou política existente é alterada. O Partner NÃO grava direto em horas, relatórios ou entregas:
-- ele envia para filas novas e a administradora decide. Só o que ela aprova vira lançamento de horas de verdade.

-- 1) Ocorrências: o Partner responde nas empresas atribuídas (aparece com o nome dele, do lado da CALI).
drop policy if exists account_record_messages_partner_insert on cali_workspace.account_record_messages;
create policy account_record_messages_partner_insert on cali_workspace.account_record_messages for insert to authenticated
  with check ((select cali_workspace.is_partner()) and author_id = (select auth.uid()) and author_role = 'admin'
              and cali_workspace.partner_can_access(company_id, 'records')
              and exists (select 1 from cali_workspace.account_records r where r.id = record_id and r.company_id = account_record_messages.company_id));

-- 2) Horas do Partner: fila "aguardando aprovação". Justificativa obrigatória.
create table if not exists cali_workspace.staff_hour_submissions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  project_id uuid references cali_workspace.projects(id) on delete set null,
  deliverable_id uuid references cali_workspace.deliverables(id) on delete set null,
  account_record_id uuid references cali_workspace.account_records(id) on delete set null,
  work_date date not null default current_date,
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  description text not null check (char_length(btrim(description)) >= 3),
  justification text not null check (char_length(btrim(justification)) >= 10),
  category text not null default 'Execução',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);
alter table cali_workspace.staff_hour_submissions enable row level security;
create policy staff_hours_admin_all on cali_workspace.staff_hour_submissions for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy staff_hours_self_read on cali_workspace.staff_hour_submissions for select to authenticated using (staff_user_id = (select auth.uid()));
create policy staff_hours_self_insert on cali_workspace.staff_hour_submissions for insert to authenticated
  with check ((select cali_workspace.is_partner()) and staff_user_id = (select auth.uid()) and status = 'pending' and decided_by is null and decided_at is null
              and cali_workspace.partner_can_access(company_id, 'hours'));
grant select, insert, update, delete on cali_workspace.staff_hour_submissions to authenticated;

-- 3) Relatórios, entregas e outros materiais: o Partner "envia para a Patricia"; ela aprova ou devolve.
create table if not exists cali_workspace.staff_review_requests (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references cali_workspace.companies(id) on delete cascade,
  kind text not null check (kind in ('report', 'deliverable', 'document', 'notice', 'other')),
  entity_id uuid,
  title text not null check (char_length(btrim(title)) >= 3),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);
alter table cali_workspace.staff_review_requests enable row level security;
create policy staff_reviews_admin_all on cali_workspace.staff_review_requests for all to authenticated using (cali_workspace.is_admin()) with check (cali_workspace.is_admin());
create policy staff_reviews_self_read on cali_workspace.staff_review_requests for select to authenticated using (staff_user_id = (select auth.uid()));
create policy staff_reviews_self_insert on cali_workspace.staff_review_requests for insert to authenticated
  with check ((select cali_workspace.is_partner()) and staff_user_id = (select auth.uid()) and status = 'pending' and decided_by is null and decided_at is null
              and cali_workspace.partner_can_access(company_id));
grant select, insert, update, delete on cali_workspace.staff_review_requests to authenticated;

-- 4) Decisão da administradora sobre horas: aprovar cria o lançamento oficial (pela função de horas manuais que já existe).
create or replace function cali_workspace.admin_decide_staff_hours(p_submission_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_row cali_workspace.staff_hour_submissions; v_name text;
begin
  if not cali_workspace.is_admin() then raise exception 'Acesso restrito à administradora' using errcode = '42501'; end if;
  select * into v_row from cali_workspace.staff_hour_submissions where id = p_submission_id for update;
  if v_row.id is null then raise exception 'Lançamento não encontrado'; end if;
  if v_row.status <> 'pending' then raise exception 'Este lançamento já foi decidido'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note, '')), '') is null then raise exception 'Informe o motivo da recusa'; end if;
  if p_approve then
    select full_name into v_name from cali_workspace.staff_members where user_id = v_row.staff_user_id;
    perform cali_workspace.add_manual_hour_entry(
      p_company_id => v_row.company_id, p_project_id => v_row.project_id, p_deliverable_id => v_row.deliverable_id,
      p_work_date => v_row.work_date, p_minutes => v_row.minutes, p_description => v_row.description, p_category => v_row.category,
      p_internal_note => 'Lançado por ' || coalesce(v_name, 'Partner') || ' (Equipe CALI) · Justificativa: ' || v_row.justification,
      p_client_visible => false);
  end if;
  update cali_workspace.staff_hour_submissions set status = case when p_approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_submission_id;
  insert into cali_workspace.activity_log (company_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_row.company_id, auth.uid(), case when p_approve then 'staff_hours_approved' else 'staff_hours_rejected' end, 'staff_hour_submission', v_row.id,
          jsonb_build_object('minutes', v_row.minutes, 'reason', nullif(btrim(coalesce(p_note, '')), ''), 'staff_user_id', v_row.staff_user_id));
end;
$$;
revoke all on function cali_workspace.admin_decide_staff_hours(uuid, boolean, text) from public, anon;
grant execute on function cali_workspace.admin_decide_staff_hours(uuid, boolean, text) to authenticated;
