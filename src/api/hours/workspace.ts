import { z } from 'zod';
import type { CompanyLogoRecord } from '../../lib/companyWorkspaceLogo';
import { requireHoursClient } from './client';

const staffSummary = z.array(z.object({ company_id: z.string(), minutes: z.coerce.number().nullish() }));

export type StaffHoursCompany = {
  id: string; display_name: string; logo_url: string | null;
  monthly_hours_contracted: number | null; service_plan: string | null;
};

type ProjectRow = { id: string; company_id: string; name: string; status: string | null; planning_status: string | null };
type DeliverableRow = { id: string; company_id: string; project_id: string | null; title: string; status: string; protocol: string | null };
type TaskRow = Omit<DeliverableRow, 'project_id'> & { deliverable_id: string };
type CycleRow = { id: string; company_id: string; project_id: string | null; contracted_hours: number | null };
type VisibilityRow = { company_id: string; period_start: string; enabled: boolean };
export type HoursCompanyLogo = CompanyLogoRecord & { status?: string | null };

export type HourSource = 'timer' | 'manual' | 'calendar' | 'interaction';

type EntryCore = {
  id: string; company_id: string; project_id: string | null; deliverable_id: string | null;
  work_date: string; minutes: number; description: string; category: string | null; created_at: string;
};

type EntryRow = EntryCore & {
  task_id: string | null; source_type: HourSource | null; client_visible?: boolean;
  internal_note: string | null; started_at: string | null; ended_at: string | null;
};

type SubmissionRow = EntryCore & {
  justification: string | null; status: 'pending' | 'approved' | 'rejected'; decision_note: string | null;
};

type TimerRow = {
  id: string; company_id: string; project_id: string | null; deliverable_id: string | null; task_id: string | null;
  cycle_id: string | null; user_id: string; started_at: string; status: 'active' | 'paused'; paused_at: string | null;
  paused_seconds: number | null; category: string | null; description: string | null; client_visible: boolean;
};

const entryColumns = 'id,company_id,project_id,deliverable_id,task_id,work_date,minutes,description,category,source_type,internal_note,started_at,ended_at,created_at';

function readEntries(start: string, next: string, includeClientVisibility: boolean) {
  const columns = includeClientVisibility ? entryColumns.replace('source_type', 'source_type,client_visible') : entryColumns;
  return requireHoursClient().from('hour_entries').select(columns).gte('work_date', start).lt('work_date', next)
    .order('work_date', { ascending: false }).order('created_at', { ascending: false }).returns<EntryRow[]>();
}

function mapEntryCore(row: EntryCore) {
  return {
    id: row.id, companyId: row.company_id, projectId: row.project_id, deliverableId: row.deliverable_id,
    workDate: row.work_date, minutes: Number(row.minutes || 0), description: row.description,
    category: row.category, createdAt: row.created_at,
  };
}

function mapEntry(row: EntryRow, staff = false) {
  const sourceType: HourSource = row.source_type || 'manual';
  return {
    ...mapEntryCore(row), taskId: row.task_id, sourceType,
    clientVisible: staff ? false : Boolean(row.client_visible), internalNote: row.internal_note,
    startedAt: row.started_at, endedAt: row.ended_at,
  };
}

export async function readHoursCompanyLogos(signal: AbortSignal) {
  return await requireHoursClient().from('companies')
    .select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status')
    .neq('status', 'closed').order('display_name').abortSignal(signal).returns<HoursCompanyLogo[]>();
}

function mapSubmission(row: SubmissionRow) {
  const reason = row.justification || '';
  const sourceType: HourSource = /^(Tempo medido no cronômetro|Cronômetro pausado)/i.test(reason)
    ? 'timer' : /^Intera/i.test(reason) ? 'interaction' : 'manual';
  return {
    ...mapEntryCore(row), taskId: null, sourceType, clientVisible: false, internalNote: row.justification,
    startedAt: null, endedAt: null, staffStatus: row.status, staffNote: row.decision_note,
  };
}

function readSubmissions(start: string, next: string) {
  return requireHoursClient().from('staff_hour_submissions')
    .select('id,company_id,project_id,deliverable_id,work_date,minutes,description,justification,category,status,decision_note,created_at')
    .gte('work_date', start).lt('work_date', next).order('work_date', { ascending: false })
    .order('created_at', { ascending: false }).returns<SubmissionRow[]>();
}

export async function readHoursWorkspace(start: string, next: string, staffCompanies?: StaffHoursCompany[]) {
  const client = requireHoursClient();
  const actor = await client.auth.getUser();
  if (actor.error) throw actor.error;
  const userId = actor.data.user?.id;
  const [companyRows, visibilityRows, projects, deliverables, tasks, cycles, entries, submissions, timers] = await Promise.all([
    staffCompanies ? { data: staffCompanies.map((row) => ({ ...row, show_hours_to_client: false })), error: null }
      : client.from('companies').select('id,display_name,logo_url,monthly_hours_contracted,service_plan,show_hours_to_client')
        .neq('status', 'closed').order('display_name').returns<(StaffHoursCompany & { show_hours_to_client: boolean })[]>(),
    staffCompanies ? { data: [], error: null } : client.from('company_hours_visibility').select('company_id,period_start,enabled')
      .lte('period_start', start).order('period_start', { ascending: false }).returns<VisibilityRow[]>(),
    client.from('projects').select('id,company_id,name,status,planning_status').neq('status', 'cancelled').order('name').returns<ProjectRow[]>(),
    client.from('deliverables').select('id,company_id,project_id,title,status,protocol').neq('status', 'cancelled').order('title').returns<DeliverableRow[]>(),
    client.from('deliverable_tasks').select('id,company_id,deliverable_id,title,status,protocol')
      .neq('status', 'cancelled').order('sort_order').order('created_at').returns<TaskRow[]>(),
    client.from('service_cycles').select('id,company_id,project_id,contracted_hours').gte('reference_month', start).lt('reference_month', next).returns<CycleRow[]>(),
    staffCompanies ? { data: [], error: null } : readEntries(start, next, true),
    staffCompanies ? readSubmissions(start, next) : { data: [], error: null },
    userId ? client.from('work_timers').select('id,company_id,project_id,deliverable_id,task_id,cycle_id,user_id,started_at,status,paused_at,paused_seconds,category,description,client_visible')
      .in('status', ['active', 'paused']).eq('user_id', userId).order('started_at', { ascending: true }).returns<TimerRow[]>() : { data: [], error: null },
  ]);
  for (const result of [companyRows, visibilityRows, projects, deliverables, tasks, cycles, entries, submissions, timers]) {
    if (result.error) throw result.error;
  }

  const visibility = new Map<string, boolean>();
  for (const row of visibilityRows.data ?? []) {
    if (!visibility.has(row.company_id)) visibility.set(row.company_id, Boolean(row.enabled));
  }

  let ledger: (ReturnType<typeof mapEntry> | ReturnType<typeof mapSubmission>)[] = (entries.data ?? []).map((row) => mapEntry(row));
  let staffUsage: Record<string, number> = {};
  if (staffCompanies) {
    const summary = await client.rpc('partner_hours_summary', { p_month: start });
    staffUsage = Object.fromEntries((staffSummary.safeParse(summary.data).data ?? []).map((row) => [row.company_id, row.minutes || 0]));
    const own = await readEntries(start, next, false);
    const ownEntries = (own.data ?? []).map((row) => mapEntry(row, true));
    const ownIds = new Set(ownEntries.map((row) => row.id));
    const pending = (submissions.data ?? []).filter((row) => !ownIds.has(row.id)).map(mapSubmission);
    ledger = ownEntries.length ? [...ownEntries, ...pending].sort((a, b) =>
      (b.workDate + b.createdAt).localeCompare(a.workDate + a.createdAt)) : pending;
  }

  return {
    companies: (companyRows.data ?? []).map((row) => ({
      id: row.id, name: row.display_name, logoUrl: row.logo_url, monthlyHours: Number(row.monthly_hours_contracted || 0),
      servicePlan: row.service_plan, showHoursToClient: visibility.get(row.id) ?? Boolean(row.show_hours_to_client),
    })),
    projects: (projects.data ?? []).map((row) => ({
      id: row.id, companyId: row.company_id, name: row.name, status: row.status, planningStatus: row.planning_status,
    })),
    deliverables: (deliverables.data ?? []).map((row) => ({
      id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, status: row.status, protocol: row.protocol,
    })),
    tasks: (tasks.data ?? []).map((row) => ({
      id: row.id, companyId: row.company_id, deliverableId: row.deliverable_id, title: row.title, status: row.status, protocol: row.protocol,
    })),
    cycles: (cycles.data ?? []).map((row) => ({
      id: row.id, companyId: row.company_id, projectId: row.project_id,
      contractedHours: row.contracted_hours === null ? null : Number(row.contracted_hours),
    })),
    timers: (timers.data ?? []).map((row) => ({
      id: row.id, companyId: row.company_id, projectId: row.project_id, deliverableId: row.deliverable_id, taskId: row.task_id,
      cycleId: row.cycle_id, userId: row.user_id, startedAt: row.started_at, status: row.status, pausedAt: row.paused_at,
      pausedSeconds: Number(row.paused_seconds || 0), category: row.category, description: row.description,
      clientVisible: Boolean(row.client_visible),
    })),
    entries: ledger,
    staffUsage,
  };
}
