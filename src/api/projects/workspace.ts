import { requireProjectClient } from './client';

type Payload = Record<string, unknown>;

export type ProjectCompany = {
  id: string;
  display_name: string;
  logo_url: string | null;
  service_type?: string | null;
  service_plan?: string | null;
};

export async function countAdminProjects(signal: AbortSignal) {
  const { count, error } = await requireProjectClient().from('projects').select('id', { count: 'exact', head: true }).abortSignal(signal);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function readProjectsWorkspace(companies?: ProjectCompany[]) {
  const client = requireProjectClient();
  const [companyRows, projects, fronts, deliverables, tasks, hours, timers] = await Promise.all([
    companies ? Promise.resolve({ data: companies }) : client.from('companies').select('id,display_name,logo_url,service_type,service_plan').neq('status', 'closed').order('display_name'),
    client.from('projects').select('id,protocol,company_id,name,description,status,planning_status,start_date,target_end_date,client_response_business_days,adjustment_limit').order('created_at', { ascending: false }),
    client.from('project_workstreams').select('id,protocol,project_id,company_id,name,objective,roadmap_month_start,roadmap_month_end,status,sort_order').order('sort_order'),
    client.from('deliverables').select('id,protocol,code,project_id,company_id,title,description,status,workstream,workstream_id,complexity,roadmap_month_start,roadmap_month_end,due_at,original_due_at,client_response_due_at,client_delay_business_days,adjustment_count,rebriefing_required,is_document,sort_order,client_visible,review_revision').order('sort_order'),
    client.from('deliverable_tasks').select('id,protocol,deliverable_id,title,description,status,due_at,client_visible,estimated_minutes,sort_order').order('sort_order'),
    client.from('hour_entries').select('deliverable_id,minutes'),
    client.from('work_timers').select('id,deliverable_id,task_id,started_at,status').eq('status', 'active').order('started_at', { ascending: false }).limit(1),
  ]);
  return {
    companyRows: companyRows.data, projectRows: projects.data, frontRows: fronts.data,
    deliverableRows: deliverables.data, taskRows: tasks.data, hourRows: hours.data, timerRows: timers.data,
  };
}

export async function readProjectPartnerContext() {
  const client = requireProjectClient();
  const [{ data: auth }, profiles, admins, pending] = await Promise.all([
    client.auth.getUser(), client.from('profiles').select('id,full_name,avatar_url'), client.rpc('staff_admin_contacts'),
    client.from('staff_review_requests').select('entity_id').eq('kind', 'deliverable').eq('status', 'pending'),
  ]);
  return {
    userId: auth.user?.id ?? '',
    pending: Object.fromEntries((pending.data ?? []).map((row) => [row.entity_id, true])),
    people: [...(profiles.data ?? []), ...(admins.data ?? [])] as { id: string; full_name?: string; avatar_url?: string }[],
  };
}

export async function readDeliverableContext(deliverableId: string, partner: boolean) {
  const client = requireProjectClient();
  const [comments, statuses, corrections] = await Promise.all([
    client.from('comments').select('id,body,client_visible,created_at').eq('target_type', 'deliverable').eq('target_id', deliverableId).order('created_at'),
    client.from('deliverable_status_history').select('*').eq('deliverable_id', deliverableId).order('created_at', { ascending: false }),
    partner ? Promise.resolve({ data: null }) : client.rpc('read_deliverable_review_history_v2', { p_deliverable_id: deliverableId }),
  ]);
  return { commentRows: comments.data, statusRows: statuses.data, correctionRows: corrections.data };
}

export async function createProjectWithFronts(project: Payload & { company_id: string }, fronts: Payload[]) {
  const client = requireProjectClient();
  const { data, error } = await client.from('projects').insert(project).select('id').single();
  if (error) throw error;
  if (fronts.length && data?.id) {
    const result = await client.from('project_workstreams').insert(fronts.map((front) => ({
      ...front, company_id: project.company_id, project_id: data.id,
    })));
    if (result.error) throw result.error;
  }
  return data?.id as string | undefined;
}

export async function createProjectFront(row: Payload) {
  return await requireProjectClient().from('project_workstreams').insert(row);
}

export async function publishProjectSchedule(projectId: string) {
  return await requireProjectClient().from('projects').update({ planning_status: 'client_review' }).eq('id', projectId);
}

export async function insertDeliverable(row: Payload) {
  return await requireProjectClient().from('deliverables').insert(row);
}

export async function updateDeliverable(id: string, row: Payload) {
  return await requireProjectClient().from('deliverables').update(row).eq('id', id);
}

export async function deleteDeliverableDraft(id: string) {
  return await requireProjectClient().from('deliverables').delete().eq('id', id);
}

export async function logDeliverableDeadlineEdit(id: string, companyId: string, before: string, after: string) {
  const client = requireProjectClient();
  const { data } = await client.auth.getUser();
  return await client.from('deliverable_due_revisions').insert({
    deliverable_id: id, company_id: companyId, previous_due: before, new_due: after, cause: 'internal',
    reason: 'Prazo ajustado pela CALI na edição do entregável.', created_by: data.user?.id ?? null,
  });
}

export async function changeDeliverableStatus(id: string, status: string, note: string | null, revision: number, partner: boolean) {
  const client = requireProjectClient();
  const update = { p_deliverable_id: id, p_status: status, p_note: note };
  return partner ? await client.rpc('partner_change_deliverable_status', update)
    : await client.rpc('change_deliverable_review_status_v2', { ...update, p_review_revision: revision });
}

export async function reopenDeliverableReview(id: string, revision: number, reason: string) {
  return await requireProjectClient().rpc('reopen_deliverable_for_review_v2', { p_deliverable_id: id, p_review_revision: revision, p_reason: reason });
}

export async function requestDeliverableAdjustment(id: string, reason: string, impact: number) {
  return await requireProjectClient().rpc('request_deliverable_adjustment', { p_deliverable_id: id, p_reason: reason, p_impact_business_days: impact });
}

export async function requestPartnerDeliverableReview(id: string) {
  return await requireProjectClient().rpc('partner_request_deliverable_review', { p_deliverable_id: id, p_note: null });
}

export async function submitPartnerProjectChange(companyId: string, action: string, title: string, payload: Payload) {
  const client = requireProjectClient();
  const { data } = await client.auth.getUser();
  return await client.from('staff_review_requests').insert({
    staff_user_id: data.user?.id, company_id: companyId, kind: 'change', title: title.slice(0, 200), payload: { action, ...payload },
  });
}

export async function startProjectWorkTimer(companyId: string, projectId: string, deliverableId: string, taskId: string | null, note: string) {
  return await requireProjectClient().rpc('start_work_timer', {
    p_company_id: companyId, p_project_id: projectId, p_deliverable_id: deliverableId, p_task_id: taskId, p_note: note,
  });
}

export async function startPartnerDeliverableTimer(deliverableId: string) {
  return await requireProjectClient().rpc('partner_start_deliverable_timer', { p_deliverable_id: deliverableId });
}
