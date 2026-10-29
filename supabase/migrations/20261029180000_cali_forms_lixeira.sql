-- CALI Forms: lixeira. Excluir um formulário ou respostas guarda antes uma cópia completa por 30 dias,
-- e a administradora restaura pela tela Formulários → Lixeira. Só acréscimo: tabelas, gatilhos e funções novas.
-- Motivo: em 29/10/2026 o "Coffee RH CWB" foi excluído sem querer e as respostas foram apagadas junto (cascade).

create table if not exists cali_workspace.forms_trash (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('form', 'responses')),
  form_id uuid not null,
  form_title text not null,
  form jsonb,
  responses jsonb not null default '[]'::jsonb,
  deleted_by uuid default auth.uid(),
  deleted_at timestamptz not null default now(),
  restored_at timestamptz
);
create index if not exists forms_trash_deleted_at_idx on cali_workspace.forms_trash (deleted_at desc);
alter table cali_workspace.forms_trash enable row level security;
create policy forms_trash_admin_read on cali_workspace.forms_trash for select to authenticated using (cali_workspace.is_admin());
grant select on cali_workspace.forms_trash to authenticated;

-- Formulário excluído: guarda o formulário e todas as respostas antes do cascade.
create or replace function cali_workspace.forms_trash_form() returns trigger
language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
begin
  insert into cali_workspace.forms_trash (kind, form_id, form_title, form, responses)
  values ('form', old.id, old.title, to_jsonb(old),
          coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at) from cali_workspace.form_responses r where r.form_id = old.id), '[]'::jsonb));
  return old;
end $$;
drop trigger if exists forms_trash_form on cali_workspace.forms;
create trigger forms_trash_form before delete on cali_workspace.forms for each row execute function cali_workspace.forms_trash_form();

-- Respostas excluídas pela tela (o formulário continua): uma entrada por exclusão, com as respostas apagadas.
create or replace function cali_workspace.forms_trash_responses() returns trigger
language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
begin
  insert into cali_workspace.forms_trash (kind, form_id, form_title, responses)
  select 'responses', d.form_id, coalesce(f.title, 'Formulário'), jsonb_agg(to_jsonb(d) order by d.submitted_at)
  from deleted d left join cali_workspace.forms f on f.id = d.form_id
  where f.id is not null -- respostas apagadas junto com o formulário já estão na entrada do formulário
  group by d.form_id, f.title;
  return null;
end $$;
drop trigger if exists forms_trash_responses on cali_workspace.form_responses;
create trigger forms_trash_responses after delete on cali_workspace.form_responses
  referencing old table as deleted for each statement execute function cali_workspace.forms_trash_responses();

-- Restaurar: devolve o formulário (se for o caso) e as respostas com os mesmos ids. Só a administradora.
create or replace function public.cali_forms_trash_restore(p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'cali_workspace', 'public' as $$
declare v cali_workspace.forms_trash%rowtype; v_count integer;
begin
  if not cali_workspace.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v from cali_workspace.forms_trash where id = p_id and restored_at is null for update;
  if not found then raise exception 'Item não encontrado na lixeira.'; end if;
  if v.kind = 'form' then
    if exists (select 1 from cali_workspace.forms where id = v.form_id) then raise exception 'Este formulário já está na lista.'; end if;
    if exists (select 1 from cali_workspace.forms where slug = v.form->>'slug') then raise exception 'Já existe um formulário com o endereço %. Troque o endereço dele antes de restaurar.', v.form->>'slug'; end if;
    insert into cali_workspace.forms select * from jsonb_populate_record(null::cali_workspace.forms, v.form);
  elsif not exists (select 1 from cali_workspace.forms where id = v.form_id) then
    raise exception 'O formulário destas respostas foi excluído. Restaure o formulário primeiro.';
  end if;
  insert into cali_workspace.form_responses
  select * from jsonb_populate_recordset(null::cali_workspace.form_responses, v.responses)
  on conflict (id) do nothing;
  get diagnostics v_count = row_count;
  update cali_workspace.forms_trash set restored_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'responses', v_count);
end $$;
revoke all on function public.cali_forms_trash_restore(uuid) from public, anon;
grant execute on function public.cali_forms_trash_restore(uuid) to authenticated;

-- Depois de 30 dias a cópia sai da lixeira.
create or replace function cali_workspace.forms_trash_purge() returns void
language sql security definer set search_path to 'cali_workspace' as $$
  delete from cali_workspace.forms_trash where deleted_at < now() - interval '30 days' or restored_at < now() - interval '30 days';
$$;
revoke all on function cali_workspace.forms_trash_purge() from public, anon, authenticated;
select cron.schedule('cali-forms-trash-purge', '20 6 * * *', $cron$select cali_workspace.forms_trash_purge();$cron$);
