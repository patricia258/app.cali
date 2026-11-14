begin;

-- Postgres Changes ignora RLS ao difundir DELETE e expõe a chave da linha removida.
-- A publicação de mensagens privadas do Realtime mantém sua configuração própria.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname <> 'cali_workspace'
  ) then
    raise exception 'A publicação Realtime tem tabelas fora do Workspace. Confira a configuração.';
  end if;
end;
$$;

alter publication supabase_realtime set (publish = 'insert, update');

commit;
