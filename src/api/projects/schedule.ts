import { requireProjectClient } from './client';
import type { ScheduleReviewChanges } from '../../domain/projects';

const scheduleColumns = 'id,name,planning_status,start_date,roadmap_start_date,roadmap_end_date';
const reviewColumns = 'id,project_id,status,request_number,response_due_at,response_note,requested_changes,resolution_note,requested_at';

export type ScheduleReviewRequest = {
  id: string;
  status: string;
  request_number: number;
  response_due_at: string | null;
  response_note: string | null;
  requested_changes: ScheduleReviewChanges | null;
  requested_at: string;
};

export async function readProjectScheduleReviewRequests(projectId: string, signal: AbortSignal) {
  const { data, error } = await requireProjectClient().from('project_review_requests').select(reviewColumns)
    .eq('project_id', projectId).order('requested_at', { ascending: false }).abortSignal(signal);
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduleReviewRequest[];
}

export async function readClientScheduleReview(companyId: string, projectId: string, signal: AbortSignal) {
  const client = requireProjectClient();
  const { data: project, error } = await client.from('projects').select(scheduleColumns)
    .eq('company_id', companyId).eq('id', projectId).abortSignal(signal).maybeSingle();
  if (error) throw new Error(error.message);
  const expectedStatus = project?.planning_status === 'client_review' ? 'pending'
    : project?.planning_status === 'adjustment_requested' ? 'adjustment_requested' : null;
  if (!project || !expectedStatus) return null;

  const [fronts, deliverables, reviews] = await Promise.all([
    client.from('project_workstreams').select('id,name')
      .eq('project_id', projectId).neq('status', 'cancelled').order('sort_order').abortSignal(signal),
    client.from('deliverables').select('id,title,due_at,complexity')
      .eq('project_id', projectId).neq('status', 'cancelled').order('sort_order').abortSignal(signal),
    readProjectScheduleReviewRequests(projectId, signal),
  ]);
  if (fronts.error) throw new Error(fronts.error.message);
  if (deliverables.error) throw new Error(deliverables.error.message);
  const review = reviews.find((item) => item.status === expectedStatus);
  if (!review) return null;
  return { project, fronts: fronts.data ?? [], deliverables: deliverables.data ?? [], review };
}

export type ClientScheduleReview = NonNullable<Awaited<ReturnType<typeof readClientScheduleReview>>>;

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

export type ScheduleAdjustment = {
  p_project_id: string;
  p_target_type: 'workstream' | 'deliverable' | 'project';
  p_target_id: string | null;
  p_reason: string;
  p_priority: string | null;
  p_action: 'reschedule' | 'swap_order' | 'change_proposal' | null;
  p_requested_date: string | null;
  p_swap_target_id: string | null;
};

export async function requestScheduleAdjustment(input: ScheduleAdjustment) {
  return await requireProjectClient().rpc('client_request_project_schedule_adjustment_v39', input);
}

export async function approveProjectSchedule(id: string) {
  return await requireProjectClient().rpc('client_approve_project_schedule', { p_project_id: id });
}
