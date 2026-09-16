-- CALI Workspace · consistência entre Projetos e Documentos
-- Um arquivo invisível ao cliente não deve permanecer semanticamente publicado.
-- Arquivos publicados e visíveis recebem data de publicação automaticamente.

create or replace function cali_workspace.normalize_file_visibility_status()
returns trigger
language plpgsql
set search_path = cali_workspace, public
as $$
begin
  if new.status <> 'archived'
     and coalesce(new.client_visible, false) = false
     and new.status = 'published' then
    new.status := 'draft';
  end if;

  if new.status = 'published'
     and coalesce(new.client_visible, false) = true
     and new.published_at is null then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists files_normalize_visibility_status on cali_workspace.files;
create trigger files_normalize_visibility_status
before insert or update of status, client_visible, published_at
on cali_workspace.files
for each row execute function cali_workspace.normalize_file_visibility_status();
