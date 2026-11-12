import { requireProjectClient } from './client';

const scheduleColumns = 'id,protocol,company_id,name,planning_status,start_date,roadmap_start_date,target_end_date,roadmap_end_date,client_response_business_days,client_approved_at,activated_at';

async function readScheduleParts(projectId: string) {
  const client = requireProjectClient();
  const [fronts, deliverables, reviews] = await Promise.all([
    client.from('project_workstreams').select('id,protocol,project_id,name,objective,status,sort_order,roadmap_month_start,roadmap_month_end')
      .eq('project_id', projectId).neq('status', 'cancelled').order('sort_order'),
    client.from('deliverables').select('id,protocol,project_id,workstream,workstream_id,title,due_at,status,sort_order,complexity')
      .eq('project_id', projectId).neq('status', 'cancelled').order('sort_order'),
    client.from('project_review_requests').select('id,project_id,status,request_number,response_due_at,response_note,requested_changes,resolution_note,requested_at')
      .eq('project_id', projectId).order('requested_at', { ascending: false }),
  ]);
  return { fronts: fronts.data ?? [], deliverables: deliverables.data ?? [], reviews: reviews.data ?? [] };
}

export async function readAdminScheduleReview(protocol: string) {
  const { data: project, error } = await requireProjectClient().from('projects').select(scheduleColumns)
    .eq('protocol', protocol).maybeSingle();
  if (error || !project) return null;
  return { project, ...await readScheduleParts(project.id) };
}

export async function readClientScheduleReview(selectedProjectId: string) {
  const client = requireProjectClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user?.id) return null;
  const { data: profile } = await client.from('profiles').select('company_id').eq('id', auth.user.id).maybeSingle();
  if (!profile?.company_id) return null;
  const { data: projects, error } = await client.from('projects').select(scheduleColumns)
    .eq('company_id', profile.company_id).order('created_at', { ascending: false });
  if (error || !projects?.length) return null;
  const project = projects.find((row) => row.id === selectedProjectId)
    ?? projects.find((row) => row.planning_status === 'client_review' || row.planning_status === 'adjustment_requested') ?? projects[0];
  return { project, ...await readScheduleParts(project.id) };
}

export async function renameProjectWorkstream(id: string, name: string, objective: string | null) {
  return await requireProjectClient().rpc('admin_update_project_workstream', { p_workstream_id: id, p_name: name, p_objective: objective });
}

export async function deleteProjectWorkstream(id: string, destinationId: string | null) {
  return await requireProjectClient().rpc('admin_delete_project_workstream', { p_workstream_id: id, p_move_to_workstream_id: destinationId });
}

export async function resolveScheduleAdjustment(id: string, accept: boolean, justification: string) {
  return await requireProjectClient().rpc('admin_resolve_project_schedule_adjustment', { p_review_id: id, p_accept: accept, p_justification: justification });
}

export async function sendScheduleReminder(project: { id: string; company_id: string; name: string }, actor: string) {
  return await requireProjectClient().rpc('notify_workspace_movement', {
    p_company_id: project.company_id, p_actor_id: actor, p_target: 'client', p_notification_type: 'project_schedule_reminder',
    p_title: 'Lembrete: cronograma aguardando sua aprovação',
    p_body: `${project.name} continua aguardando sua aprovação. Acesse o Workspace para revisar o cronograma.`,
    p_entity_type: 'project', p_entity_id: project.id, p_action_url: '/cliente/entregaveis', p_relevance: 'high', p_email_required: true,
  });
}

type ScheduleAdjustment = {
  p_project_id: string; p_target_type: string; p_target_id: string | null; p_reason: string; p_priority: string | null;
};

export async function requestScheduleAdjustment(input: ScheduleAdjustment) {
  return await requireProjectClient().rpc('client_request_project_schedule_adjustment', input);
}

export async function requestScheduleAdjustmentV39(input: ScheduleAdjustment & {
  p_action: string | null; p_requested_date: string | null; p_swap_target_id: string | null;
}) {
  return await requireProjectClient().rpc('client_request_project_schedule_adjustment_v39', input);
}

export async function approveProjectSchedule(id: string) {
  return await requireProjectClient().rpc('client_approve_project_schedule', { p_project_id: id });
}
