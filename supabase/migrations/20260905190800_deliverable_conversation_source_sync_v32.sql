-- CALI Workspace · Deliverable conversation source and client-view semantics

alter table cali_workspace.comments
  add column if not exists source_actor text;

update cali_workspace.comments c
set source_actor = case
  when p.role = 'client' then 'client'
  when p.role = 'admin' then 'admin'
  else 'system'
end
from cali_workspace.profiles p
where c.author_user_id = p.id
  and c.source_actor is null;

update cali_workspace.comments
set source_actor = 'system'
where source_actor is null;

alter table cali_workspace.comments
  drop constraint if exists comments_source_actor_check;
alter table cali_workspace.comments
  add constraint comments_source_actor_check
  check (source_actor = any(array['admin'::text,'client'::text,'system'::text]));

create or replace function cali_workspace.normalize_comment_source_actor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_role text;
begin
  if new.author_user_id is null then
    new.source_actor := coalesce(new.source_actor, 'system');
    return new;
  end if;

  select role into v_role
  from cali_workspace.profiles
  where id = new.author_user_id and active = true;

  if v_role = 'client' then
    new.source_actor := 'client';
  elsif v_role = 'admin' then
    new.source_actor := coalesce(new.source_actor, 'admin');
  else
    new.source_actor := coalesce(new.source_actor, 'system');
  end if;
  return new;
end;
$$;

drop trigger if exists comments_normalize_source_actor on cali_workspace.comments;
create trigger comments_normalize_source_actor
before insert or update of author_user_id, source_actor on cali_workspace.comments
for each row execute function cali_workspace.normalize_comment_source_actor();

drop policy if exists comments_client_insert_context on cali_workspace.comments;
create policy comments_client_insert_context
  on cali_workspace.comments
  for insert
  to authenticated
  with check (
    company_id = cali_workspace.current_company_id()
    and author_user_id = auth.uid()
    and client_visible
    and target_type = any(array['deliverable'::text,'task'::text,'project'::text])
    and source_actor = 'client'
  );

create or replace function cali_workspace.notify_comment_movement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_role text;
  v_source text;
  v_target text;
  v_url text;
  v_title text;
  v_deliverable_title text;
begin
  if not coalesce(new.client_visible,false) then return new; end if;

  select role into v_role
  from cali_workspace.profiles
  where id = new.author_user_id and active = true;

  v_source := coalesce(new.source_actor, case when v_role='client' then 'client' else 'admin' end);

  if new.target_type = 'deliverable' then
    select title into v_deliverable_title
    from cali_workspace.deliverables
    where id = new.target_id;
  end if;

  if v_source = 'client' then
    v_target := 'admin';
    v_title := case
      when new.target_type='deliverable' and v_deliverable_title is not null
        then 'Mensagem do cliente · ' || left(v_deliverable_title,120)
      else 'Nova mensagem do cliente'
    end;
    v_url := case new.target_type
      when 'report' then '/admin/relatorios'
      when 'event' then '/admin/calendario'
      when 'file' then '/admin/documentos'
      else '/admin/projetos'
    end;
  else
    v_target := 'client';
    v_title := case
      when new.target_type='deliverable' and v_deliverable_title is not null
        then 'Mensagem da CALI · ' || left(v_deliverable_title,120)
      else 'Nova mensagem da CALI'
    end;
    v_url := case new.target_type
      when 'report' then '/cliente/relatorios'
      when 'event' then '/cliente/cronograma'
      when 'file' then '/cliente/documentos'
      else '/cliente/entregaveis'
    end;
  end if;

  perform cali_workspace.notify_workspace_movement(
    new.company_id,new.author_user_id,v_target,'comment',v_title,left(new.body,420),new.target_type,new.target_id,v_url,'normal',false
  );
  return new;
end;
$$;

create or replace function cali_workspace.client_submit_deliverable_comment(
  p_deliverable_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, cali_workspace
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_profile_company_id uuid;
  v_role text;
  v_comment_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sessão não encontrada.';
  end if;
  if char_length(btrim(coalesce(p_body,''))) < 1 then
    raise exception 'Escreva uma mensagem.';
  end if;
  if char_length(btrim(p_body)) > 5000 then
    raise exception 'A mensagem é muito longa.';
  end if;

  select d.company_id
    into v_company_id
  from cali_workspace.deliverables d
  where d.id = p_deliverable_id
    and d.client_visible = true
    and d.status <> 'cancelled';

  if v_company_id is null then
    raise exception 'Entregável não disponível.';
  end if;

  select p.company_id,p.role
    into v_profile_company_id,v_role
  from cali_workspace.profiles p
  where p.id = v_user_id and p.active = true;

  if v_role = 'client' and v_profile_company_id is distinct from v_company_id then
    raise exception 'Você não tem acesso a este entregável.';
  end if;
  if v_role not in ('client','admin') then
    raise exception 'Perfil sem permissão para enviar mensagens.';
  end if;

  insert into cali_workspace.comments(
    company_id,target_type,target_id,author_user_id,body,client_visible,source_actor
  ) values (
    v_company_id,'deliverable',p_deliverable_id,v_user_id,btrim(p_body),true,'client'
  ) returning id into v_comment_id;

  return v_comment_id;
end;
$$;

grant execute on function cali_workspace.client_submit_deliverable_comment(uuid,text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='cali_workspace'
      and tablename='comments'
  ) then
    alter publication supabase_realtime add table cali_workspace.comments;
  end if;
end $$;
