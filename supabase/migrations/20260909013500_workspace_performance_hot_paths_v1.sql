create index if not exists profiles_company_idx on cali_workspace.profiles(company_id);
create index if not exists notifications_company_idx on cali_workspace.notifications(company_id);
create index if not exists events_project_idx on cali_workspace.events(project_id) where project_id is not null;
create index if not exists event_attendees_company_idx on cali_workspace.event_attendees(company_id);
create index if not exists event_attendees_user_idx on cali_workspace.event_attendees(user_id) where user_id is not null;
create index if not exists scheduling_requests_requested_by_idx on cali_workspace.scheduling_requests(requested_by);
create index if not exists scheduling_requests_billing_ack_by_idx on cali_workspace.scheduling_requests(billing_acknowledged_by) where billing_acknowledged_by is not null;
create index if not exists deliverables_cycle_idx on cali_workspace.deliverables(cycle_id) where cycle_id is not null;
create index if not exists hour_entries_project_idx on cali_workspace.hour_entries(project_id) where project_id is not null;
create index if not exists hour_entries_deliverable_idx on cali_workspace.hour_entries(deliverable_id) where deliverable_id is not null;
create index if not exists hour_entries_cycle_idx on cali_workspace.hour_entries(cycle_id) where cycle_id is not null;
create index if not exists reports_cycle_idx on cali_workspace.reports(cycle_id) where cycle_id is not null;
create index if not exists report_client_events_company_idx on cali_workspace.report_client_events(company_id);
create index if not exists event_outcomes_marked_by_idx on cali_workspace.event_outcomes(marked_by) where marked_by is not null;
create index if not exists google_calendar_credentials_user_idx on cali_workspace.google_calendar_credentials(user_id);

alter policy profiles_self_select on cali_workspace.profiles
  using (id = (select auth.uid()));

alter policy notifications_self_select on cali_workspace.notifications
  using (user_id = (select auth.uid()));

alter policy event_attendees_client_update_own on cali_workspace.event_attendees
  using (
    (company_id = cali_workspace.current_company_id())
    and (lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'::text), ''::text)))
  )
  with check (
    (company_id = cali_workspace.current_company_id())
    and (lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'::text), ''::text)))
  );
