import { requireProjectClient } from './client';

export type ProjectLifecycleScope = 'project' | 'front' | 'deliverable';
export type ProjectLifecycleAction = 'pause' | 'suspend' | 'cancel' | 'resume';

const projectColumns = 'id,execution_status,lifecycle_reason,lifecycle_resume_date';

export async function readClientProjectLifecycle(companyId: string, projectId: string | null, signal: AbortSignal) {
  const client = requireProjectClient();
  const projects = client.from('projects').select(projectColumns).eq('company_id', companyId).neq('planning_status', 'draft');
  if (projectId) projects.eq('id', projectId);
  else projects.eq('status', 'cancelled').order('created_at', { ascending: false }).limit(1);
  const { data: project, error } = await projects.abortSignal(signal).maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;

  const holds = await client.from('project_lifecycle_events').select('scope_type,reason,resume_date')
    .eq('company_id', companyId).eq('project_id', project.id).eq('client_visible', true)
    .in('action', ['pause', 'suspend']).is('resolved_at', null).order('created_at', { ascending: false }).abortSignal(signal);
  if (holds.error) throw new Error(holds.error.message);
  return { project, holds: holds.data ?? [] };
}

export async function readAdminProjectLifecycle(projectId: string, signal: AbortSignal) {
  const client = requireProjectClient();
  const [project, fronts, deliverables, holds] = await Promise.all([
    client.from('projects').select(projectColumns).eq('id', projectId).abortSignal(signal).maybeSingle(),
    client.from('project_workstreams').select('id,name').eq('project_id', projectId)
      .neq('status', 'cancelled').order('sort_order').abortSignal(signal),
    client.from('deliverables').select('id,title,workstream').eq('project_id', projectId)
      .neq('status', 'cancelled').order('sort_order').abortSignal(signal),
    client.from('project_lifecycle_events').select('id,scope_type,scope_id,scope_label,action,reason,resume_date,created_at')
      .eq('project_id', projectId).in('action', ['pause', 'suspend']).is('resolved_at', null)
      .order('created_at', { ascending: false }).abortSignal(signal),
  ]);
  const error = project.error ?? fronts.error ?? deliverables.error ?? holds.error;
  if (error) throw new Error(error.message);
  if (!project.data) return null;
  return { project: project.data, fronts: fronts.data ?? [], deliverables: deliverables.data ?? [], holds: holds.data ?? [] };
}

export type AdminProjectLifecycle = NonNullable<Awaited<ReturnType<typeof readAdminProjectLifecycle>>>;

export async function changeProjectLifecycle(projectId: string, action: ProjectLifecycleAction, scopeType: ProjectLifecycleScope, scopeId: string | null, reason: string, resumeDate: string | null) {
  return await requireProjectClient().rpc('admin_set_project_lifecycle_v44', {
    p_project_id: projectId, p_action: action, p_scope_type: scopeType, p_scope_id: scopeId, p_reason: reason, p_resume_date: resumeDate || null,
  });
}
