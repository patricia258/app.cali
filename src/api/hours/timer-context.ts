import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { requireHoursClient } from './client';

type ActiveTimer = {
  id: string;
  company_id: string;
  project_id: string | null;
  deliverable_id: string | null;
  task_id: string | null;
  started_at: string;
  paused_seconds: number | null;
  description: string | null;
};

type GlobalTimer = ActiveTimer & { account_record_id: string | null; category: string | null };
type Named = { id: string; title: string };
type DeliverableTimerReference = Named & { status: string; work_closed_at: string | null };
const activeTimerColumns = 'id,company_id,project_id,deliverable_id,task_id,started_at,paused_seconds,description';

function mapTimer(row: ActiveTimer) {
  return {
    id: row.id, companyId: row.company_id, projectId: row.project_id, deliverableId: row.deliverable_id,
    taskId: row.task_id, startedAt: row.started_at, pausedSeconds: Number(row.paused_seconds || 0),
    description: row.description,
  };
}

function uniqueIds(rows: GlobalTimer[], field: keyof GlobalTimer) {
  return [...new Set(rows.map((row) => row[field]).filter((id): id is string => typeof id === 'string' && Boolean(id)))];
}

function byId<Row extends { id: string }>(rows: Row[] | null) {
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

export async function readGlobalTimers(userId: string) {
  const client = requireHoursClient();
  const timers = await client.from('work_timers').select(`${activeTimerColumns},account_record_id,category`)
    .eq('user_id', userId).eq('status', 'active').order('started_at', { ascending: true }).returns<GlobalTimer[]>();
  if (timers.error || !timers.data?.length) return [];
  const companyIds = uniqueIds(timers.data, 'company_id');
  const projectIds = uniqueIds(timers.data, 'project_id');
  const deliverableIds = uniqueIds(timers.data, 'deliverable_id');
  const taskIds = uniqueIds(timers.data, 'task_id');
  const recordIds = uniqueIds(timers.data, 'account_record_id');
  const [companies, projects, deliverables, tasks, records] = await Promise.all([
    companyIds.length ? client.from('companies').select('id,display_name,logo_url').in('id', companyIds)
      .returns<{ id: string; display_name: string; logo_url: string | null }[]>() : { data: null },
    projectIds.length ? client.from('projects').select('id,name').in('id', projectIds)
      .returns<{ id: string; name: string }[]>() : { data: null },
    deliverableIds.length ? client.from('deliverables').select('id,title,status').in('id', deliverableIds)
      .returns<(Named & { status: string })[]>() : { data: null },
    taskIds.length ? client.from('deliverable_tasks').select('id,title').in('id', taskIds)
      .returns<Named[]>() : { data: null },
    recordIds.length ? client.from('account_records').select('id,title').in('id', recordIds)
      .returns<Named[]>() : { data: null },
  ]);
  const company = byId(companies.data);
  const project = byId(projects.data);
  const deliverable = byId(deliverables.data);
  const task = byId(tasks.data);
  const record = byId(records.data);
  return await Promise.all(timers.data.map(async (row) => {
    const companyRow = company.get(row.company_id);
    const deliverableRow = deliverable.get(row.deliverable_id ?? '');
    return {
      ...mapTimer(row), accountRecordId: row.account_record_id, category: row.category,
      companyName: companyRow?.display_name || 'Cliente', companyLogo: await resolveWorkspaceMedia(companyRow?.logo_url || ''),
      projectName: project.get(row.project_id ?? '')?.name || null,
      deliverableName: deliverableRow?.title || null, deliverableStatus: deliverableRow?.status || null,
      taskName: task.get(row.task_id ?? '')?.title || null, recordTitle: record.get(row.account_record_id ?? '')?.title || null,
    };
  }));
}

export async function readProjectTimerContext(actorId: string, companyId: string, deliverableId: string, signal: AbortSignal) {
  const client = requireHoursClient();
  const [timers, deliverable, tasks] = await Promise.all([
    client.from('work_timers').select(activeTimerColumns).eq('user_id', actorId).eq('company_id', companyId)
      .eq('status', 'active').order('started_at', { ascending: true }).limit(1).abortSignal(signal).returns<ActiveTimer[]>(),
    client.from('deliverables').select('id,title,status,work_closed_at').eq('id', deliverableId).eq('company_id', companyId)
      .abortSignal(signal).returns<DeliverableTimerReference[]>().maybeSingle(),
    client.from('deliverable_tasks').select('id,title,status,work_closed_at').eq('deliverable_id', deliverableId)
      .abortSignal(signal).returns<DeliverableTimerReference[]>(),
  ]);
  if (timers.error) throw timers.error;
  if (deliverable.error) throw deliverable.error;
  if (tasks.error) throw tasks.error;

  return {
    companyTimer: timers.data?.[0] ? mapTimer(timers.data[0]) : null,
    deliverable: deliverable.data,
    tasks: tasks.data ?? [],
  };
}
