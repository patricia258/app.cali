import { supabase } from './supabase';

export type ClientDeliveryStatus =
  | 'not_started'
  | 'in_progress'
  | 'standby'
  | 'internal_review'
  | 'client_review'
  | 'adjustment_requested'
  | 'rebriefing'
  | 'approved'
  | 'cancelled';

export type ClientVisibleTask = {
  id: string;
  protocol?: string | null;
  title: string;
  status: string;
  dueAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type ClientPublishedDocument = {
  id: string;
  title: string;
  storagePath?: string | null;
  driveUrl?: string | null;
  versionLabel?: string | null;
  publishedAt?: string | null;
};

export type ClientDeliveryFeedback = {
  score: number;
  comment?: string | null;
  createdAt: string;
};

export type ClientDeliveryAdjustment = {
  id: string;
  protocol?: string | null;
  requestNumber: number;
  kind: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  oldDueAt?: string | null;
  newDueAt?: string | null;
};

export type ClientDeliveryHistoryItem = {
  id: number;
  fromStatus?: string | null;
  toStatus: string;
  createdAt: string;
};

export type ClientDeliveryItem = {
  id: string;
  companyId: string;
  projectId?: string | null;
  projectName?: string | null;
  projectStatus?: string | null;
  projectPlanningStatus?: string | null;
  protocol?: string | null;
  code?: string | null;
  title: string;
  description?: string | null;
  status: ClientDeliveryStatus;
  priority?: string | null;
  workstream?: string | null;
  dueAt?: string | null;
  originalDueAt?: string | null;
  clientResponseDueAt?: string | null;
  startedAt?: string | null;
  approvalRequestedAt?: string | null;
  clientResponseAt?: string | null;
  approvedAt?: string | null;
  updatedAt: string;
  adjustmentCount: number;
  rebriefingRequired: boolean;
  isDocument: boolean;
  finalDriveUrl?: string | null;
  visibleMinutes: number | null;
  visibleTasks: ClientVisibleTask[];
  visibleTaskProgress: number | null;
  document: ClientPublishedDocument | null;
  feedback: ClientDeliveryFeedback | null;
  latestAdjustment: ClientDeliveryAdjustment | null;
  history: ClientDeliveryHistoryItem[];
};

export type ClientDeliveryProject = {
  id: string;
  name: string;
  protocol?: string | null;
  status: string;
  planningStatus?: string | null;
  startDate?: string | null;
  targetEndDate?: string | null;
};

export type ClientDeliveryReality = {
  company: {
    id: string;
    displayName: string;
    monthlyHoursContracted: number | null;
    showHoursToClient: boolean;
  };
  projects: ClientDeliveryProject[];
  deliverables: ClientDeliveryItem[];
  metrics: {
    total: number;
    active: number;
    waitingClient: number;
    approved: number;
    cancelled: number;
    overdue: number;
    completionPct: number;
    visibleMinutes: number | null;
    averageDeliveryScore: number | null;
    feedbackCount: number;
  };
};

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function loadClientDeliveryReality(companyId: string): Promise<ClientDeliveryReality> {
  if (!supabase) throw new Error('Workspace indisponível.');
  if (!companyId) throw new Error('Empresa do cliente não encontrada.');

  const [companyResult, projectResult, deliverableResult, taskResult, hourResult, fileResult, npsResult, adjustmentResult, historyResult] = await Promise.all([
    supabase.from('companies')
      .select('id,display_name,monthly_hours_contracted,show_hours_to_client')
      .eq('id', companyId)
      .single(),
    supabase.from('projects')
      .select('id,name,protocol,status,planning_status,start_date,target_end_date')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase.from('deliverables')
      .select('id,company_id,project_id,protocol,code,title,description,status,priority,workstream,due_at,original_due_at,client_response_due_at,started_at,approval_requested_at,client_response_at,approved_at,cancelled_at,updated_at,adjustment_count,rebriefing_required,is_document,final_drive_url,sort_order,client_visible')
      .eq('company_id', companyId)
      .eq('client_visible', true)
      .order('sort_order')
      .order('created_at'),
    supabase.from('deliverable_tasks')
      .select('id,deliverable_id,protocol,title,status,due_at,started_at,completed_at,sort_order')
      .eq('company_id', companyId)
      .eq('client_visible', true)
      .order('sort_order'),
    supabase.from('hour_entries')
      .select('deliverable_id,minutes')
      .eq('company_id', companyId)
      .eq('client_visible', true),
    supabase.from('files')
      .select('id,deliverable_id,title,storage_path,drive_url,version_label,published_at,updated_at,status,client_visible')
      .eq('company_id', companyId)
      .eq('client_visible', true)
      .eq('status', 'published')
      .not('deliverable_id', 'is', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false }),
    supabase.from('nps_responses')
      .select('deliverable_id,score,comment,created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase.from('deliverable_adjustments')
      .select('id,deliverable_id,protocol,request_number,request_kind,reason,status,created_at,resolved_at,old_due_at,new_due_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase.from('deliverable_status_history')
      .select('id,deliverable_id,from_status,to_status,created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ]);

  if (companyResult.error) throw companyResult.error;
  if (projectResult.error) throw projectResult.error;
  if (deliverableResult.error) throw deliverableResult.error;
  if (taskResult.error) throw taskResult.error;
  if (hourResult.error && companyResult.data?.show_hours_to_client) throw hourResult.error;
  if (fileResult.error) throw fileResult.error;
  if (npsResult.error) throw npsResult.error;
  if (adjustmentResult.error) throw adjustmentResult.error;
  if (historyResult.error) throw historyResult.error;

  const company = {
    id: companyResult.data.id,
    displayName: companyResult.data.display_name,
    monthlyHoursContracted: companyResult.data.monthly_hours_contracted == null ? null : finiteNumber(companyResult.data.monthly_hours_contracted),
    showHoursToClient: Boolean(companyResult.data.show_hours_to_client),
  };

  const projects: ClientDeliveryProject[] = (projectResult.data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    protocol: row.protocol,
    status: row.status,
    planningStatus: row.planning_status,
    startDate: row.start_date,
    targetEndDate: row.target_end_date,
  }));
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const tasksByDeliverable = new Map<string, ClientVisibleTask[]>();
  for (const row of taskResult.data || []) {
    const list = tasksByDeliverable.get(row.deliverable_id) || [];
    list.push({
      id: row.id,
      protocol: row.protocol,
      title: row.title,
      status: row.status,
      dueAt: row.due_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    });
    tasksByDeliverable.set(row.deliverable_id, list);
  }

  const minutesByDeliverable = new Map<string, number>();
  if (company.showHoursToClient && !hourResult.error) {
    for (const row of hourResult.data || []) {
      if (!row.deliverable_id) continue;
      minutesByDeliverable.set(row.deliverable_id, (minutesByDeliverable.get(row.deliverable_id) || 0) + finiteNumber(row.minutes));
    }
  }

  const documentByDeliverable = new Map<string, ClientPublishedDocument>();
  for (const row of fileResult.data || []) {
    if (!row.deliverable_id || documentByDeliverable.has(row.deliverable_id)) continue;
    documentByDeliverable.set(row.deliverable_id, {
      id: row.id,
      title: row.title,
      storagePath: row.storage_path,
      driveUrl: row.drive_url,
      versionLabel: row.version_label,
      publishedAt: row.published_at || row.updated_at,
    });
  }

  const feedbackByDeliverable = new Map<string, ClientDeliveryFeedback>();
  const allScores: number[] = [];
  for (const row of npsResult.data || []) {
    const score = finiteNumber(row.score);
    if (score >= 1 && score <= 5) allScores.push(score);
    if (!row.deliverable_id || feedbackByDeliverable.has(row.deliverable_id)) continue;
    feedbackByDeliverable.set(row.deliverable_id, { score, comment: row.comment, createdAt: row.created_at });
  }

  const adjustmentByDeliverable = new Map<string, ClientDeliveryAdjustment>();
  for (const row of adjustmentResult.data || []) {
    if (!row.deliverable_id || adjustmentByDeliverable.has(row.deliverable_id)) continue;
    adjustmentByDeliverable.set(row.deliverable_id, {
      id: row.id,
      protocol: row.protocol,
      requestNumber: finiteNumber(row.request_number),
      kind: row.request_kind,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      oldDueAt: row.old_due_at,
      newDueAt: row.new_due_at,
    });
  }

  const historyByDeliverable = new Map<string, ClientDeliveryHistoryItem[]>();
  for (const row of historyResult.data || []) {
    const list = historyByDeliverable.get(row.deliverable_id) || [];
    list.push({ id: Number(row.id), fromStatus: row.from_status, toStatus: row.to_status, createdAt: row.created_at });
    historyByDeliverable.set(row.deliverable_id, list);
  }

  const deliverables: ClientDeliveryItem[] = (deliverableResult.data || []).map((row: any) => {
    const project = row.project_id ? projectMap.get(row.project_id) : undefined;
    const visibleTasks = tasksByDeliverable.get(row.id) || [];
    const doneTasks = visibleTasks.filter((task) => ['done', 'completed'].includes(task.status)).length;
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      projectName: project?.name || null,
      projectStatus: project?.status || null,
      projectPlanningStatus: project?.planningStatus || null,
      protocol: row.protocol,
      code: row.code,
      title: row.title,
      description: row.description,
      status: row.status as ClientDeliveryStatus,
      priority: row.priority,
      workstream: row.workstream,
      dueAt: row.due_at,
      originalDueAt: row.original_due_at,
      clientResponseDueAt: row.client_response_due_at,
      startedAt: row.started_at,
      approvalRequestedAt: row.approval_requested_at,
      clientResponseAt: row.client_response_at,
      approvedAt: row.approved_at,
      updatedAt: row.updated_at,
      adjustmentCount: finiteNumber(row.adjustment_count),
      rebriefingRequired: Boolean(row.rebriefing_required),
      isDocument: Boolean(row.is_document),
      finalDriveUrl: row.final_drive_url,
      visibleMinutes: company.showHoursToClient ? (minutesByDeliverable.get(row.id) || 0) : null,
      visibleTasks,
      visibleTaskProgress: visibleTasks.length ? Math.round((doneTasks / visibleTasks.length) * 100) : null,
      document: documentByDeliverable.get(row.id) || null,
      feedback: feedbackByDeliverable.get(row.id) || null,
      latestAdjustment: adjustmentByDeliverable.get(row.id) || null,
      history: historyByDeliverable.get(row.id) || [],
    };
  });

  const nonCancelled = deliverables.filter((item) => item.status !== 'cancelled');
  const approved = nonCancelled.filter((item) => item.status === 'approved').length;
  const now = Date.now();
  const overdue = nonCancelled.filter((item) => {
    if (!item.dueAt || item.status === 'approved') return false;
    const due = new Date(item.dueAt).getTime();
    return Number.isFinite(due) && due < now;
  }).length;
  const visibleMinutes = company.showHoursToClient
    ? Array.from(minutesByDeliverable.values()).reduce((sum, value) => sum + value, 0)
    : null;

  return {
    company,
    projects,
    deliverables,
    metrics: {
      total: nonCancelled.length,
      active: nonCancelled.filter((item) => !['approved'].includes(item.status)).length,
      waitingClient: nonCancelled.filter((item) => item.status === 'client_review').length,
      approved,
      cancelled: deliverables.filter((item) => item.status === 'cancelled').length,
      overdue,
      completionPct: nonCancelled.length ? Math.round((approved / nonCancelled.length) * 100) : 0,
      visibleMinutes,
      averageDeliveryScore: allScores.length ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : null,
      feedbackCount: allScores.length,
    },
  };
}

export function subscribeClientDeliveryReality(companyId: string, onChange: () => void) {
  if (!supabase || !companyId) return () => undefined;
  const channel = supabase.channel(`client-delivery-reality-${companyId}`);
  const companyTables = [
    'projects',
    'deliverables',
    'deliverable_tasks',
    'deliverable_adjustments',
    'deliverable_status_history',
    'files',
    'hour_entries',
    'nps_responses',
    'events',
    'reports',
  ];
  for (const table of companyTables) {
    channel.on('postgres_changes', { event: '*', schema: 'cali_workspace', table, filter: `company_id=eq.${companyId}` }, onChange);
  }
  channel.on('postgres_changes', { event: 'UPDATE', schema: 'cali_workspace', table: 'companies', filter: `id=eq.${companyId}` }, onChange);
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
}
