import { requireProjectClient } from './client';

const projectColumns = 'id,protocol,company_id,name,planning_status,status,execution_status,start_date,target_end_date,roadmap_end_date,lifecycle_reason,lifecycle_resume_date,lifecycle_updated_at';

export async function readProjectLifecycle(protocol: string) {
  const { data, error } = await requireProjectClient().from('projects').select(projectColumns).eq('protocol', protocol).maybeSingle();
  return error ? null : data;
}

export async function readClientProjectLifecycle(selected: string) {
  const client = requireProjectClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user?.id) return null;
  const { data: profile } = await client.from('profiles').select('company_id').eq('id', auth.user.id).maybeSingle();
  if (!profile?.company_id) return null;
  const { data, error } = await client.from('projects').select(projectColumns).eq('company_id', profile.company_id)
    .neq('planning_status', 'draft').order('created_at', { ascending: false });
  if (error || !data?.length) return null;
  if (selected) return data.find((project) => project.id === selected) ?? data[0];
  return data.find((project) => project.execution_status !== 'cancelled' && project.planning_status !== 'closed') ?? data[0];
}

export async function readProjectLifecycleContext(projectId: string, eventLimit: number) {
  const client = requireProjectClient();
  const [fronts, deliverables, events] = await Promise.all([
    client.from('project_workstreams').select('id,project_id,protocol,name,status,execution_status').eq('project_id', projectId).order('sort_order'),
    client.from('deliverables').select('id,project_id,protocol,title,workstream_id,workstream,status,execution_status,due_at').eq('project_id', projectId).order('sort_order'),
    client.from('project_lifecycle_events').select('id,project_id,scope_type,scope_id,scope_label,action,reason,resume_date,created_at,resolved_at')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(eventLimit),
  ]);
  return { fronts: fronts.data ?? [], deliverables: deliverables.data ?? [], events: events.data ?? [] };
}

export async function changeProjectLifecycle(projectId: string, action: string, scopeType: string, scopeId: string | null, reason: string, resumeDate: string | null) {
  return await requireProjectClient().rpc('admin_set_project_lifecycle_v44', {
    p_project_id: projectId, p_action: action, p_scope_type: scopeType, p_scope_id: scopeId, p_reason: reason, p_resume_date: resumeDate || null,
  });
}
