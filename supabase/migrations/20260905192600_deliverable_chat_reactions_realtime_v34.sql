-- CALI Workspace · Deliverable chat reactions realtime V34

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'cali_workspace'
      and tablename = 'comment_reactions'
  ) then
    alter publication supabase_realtime add table cali_workspace.comment_reactions;
  end if;
end $$;
