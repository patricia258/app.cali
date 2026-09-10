revoke execute on function cali_workspace.get_admin_projects_workspace_snapshot() from public;
revoke execute on function cali_workspace.get_admin_projects_workspace_snapshot() from anon;
grant usage on schema cali_workspace to authenticated;
grant execute on function cali_workspace.get_admin_projects_workspace_snapshot() to authenticated;
