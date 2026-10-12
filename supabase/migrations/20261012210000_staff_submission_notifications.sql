-- Perfil Partner — aviso no sino da administradora quando chega algo para aprovar (horas ou material).
-- Só acréscimo: uma função e dois gatilhos nas tabelas novas das filas. Nada existente é alterado.
create or replace function cali_workspace.notify_admin_staff_submission() returns trigger
language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v_name text; v_company text; v_title text; v_body text;
begin
  select full_name into v_name from cali_workspace.staff_members where user_id = new.staff_user_id;
  select display_name into v_company from cali_workspace.companies where id = new.company_id;
  if tg_table_name = 'staff_hour_submissions' then
    v_title := 'Horas para aprovar · ' || coalesce(v_name, 'Equipe CALI');
    v_body := (new.minutes / 60)::text || 'h' || lpad((new.minutes % 60)::text, 2, '0') || ' em ' || coalesce(v_company, 'empresa') || ': ' || new.description;
  else
    v_title := 'Material para aprovar · ' || coalesce(v_name, 'Equipe CALI');
    v_body := new.title || ' — ' || coalesce(v_company, 'empresa');
  end if;
  insert into cali_workspace.notifications (company_id, user_id, notification_type, title, body, entity_type, entity_id, action_url, relevance, email_required)
  select new.company_id, p.id, 'staff_approval', v_title, left(v_body, 400), tg_table_name, new.id, '/admin/equipe-cali', 'high', false
  from cali_workspace.profiles p where p.role = 'admin' and p.active;
  return new;
exception when others then
  -- O aviso é um complemento: se falhar, o envio do Partner não pode ser perdido.
  return new;
end;
$$;
drop trigger if exists staff_hours_notify_admin on cali_workspace.staff_hour_submissions;
create trigger staff_hours_notify_admin after insert on cali_workspace.staff_hour_submissions for each row execute function cali_workspace.notify_admin_staff_submission();
drop trigger if exists staff_reviews_notify_admin on cali_workspace.staff_review_requests;
create trigger staff_reviews_notify_admin after insert on cali_workspace.staff_review_requests for each row execute function cali_workspace.notify_admin_staff_submission();
