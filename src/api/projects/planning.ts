import { requireProjectClient } from './client';

export async function readProjectPlanning(protocol: string) {
  const client = requireProjectClient();
  const { data: project } = await client.from('projects')
    .select('id,protocol,company_id,name,planning_status,start_date,target_end_date,roadmap_end_date,client_response_business_days')
    .eq('protocol', protocol).maybeSingle();
  if (!project?.id) return { project: null, deliverables: [] };
  const { data } = await client.from('deliverables').select('id,workstream,workstream_id,complexity,due_at,roadmap_month_start,sort_order,status')
    .eq('project_id', project.id).neq('status', 'cancelled').order('sort_order');
  return { project, deliverables: data ?? [] };
}

export async function readProjectPlanningStatuses() {
  const { data } = await requireProjectClient().from('projects').select('id,planning_status');
  return data;
}

export async function readProjectPortfolio() {
  const client = requireProjectClient();
  const [companies, projects] = await Promise.all([
    client.from('companies').select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status').order('display_name'),
    client.from('projects').select('id,protocol,company_id,name,planning_status,created_at,start_date,target_end_date,roadmap_end_date').order('created_at', { ascending: false }),
  ]);
  return { companies: companies.data ?? [], projects: projects.data ?? [] };
}
