-- Feedback de registro da própria pessoa cliente atualiza a home sem esperar o polling.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'cali_workspace'
      and tablename = 'account_record_feedback'
  ) then
    alter publication supabase_realtime add table cali_workspace.account_record_feedback;
  end if;
end $$;
