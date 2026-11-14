import { supabase } from '../../supabase';
import { loadClientDashboardReality } from '../../projects/client-delivery';
import { readClientAccountResponsibles, type AccountResponsibles } from './responsibles';

type Company = {
  id: string;
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
  service_type?: string | null;
  service_plan?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  monthly_hours_contracted?: number | null;
  show_hours_to_client?: boolean | null;
};
type Profile = { full_name: string; company_id: string; avatar_url?: string | null; avatar_position_x?: number | null; avatar_position_y?: number | null; avatar_zoom?: number | null };
type Project = { id: string; name: string; status: string; start_date?: string | null; target_end_date?: string | null };
export type Deliverable = { id: string; title: string; status: string; due_at?: string | null; project_id?: string | null };
type EventItem = { id: string; title: string; starts_at: string; mode?: string | null; meeting_url?: string | null };
type ClientDocument = { id: string; title: string; updated_at: string; category?: string | null };
type ClientOccurrence = { id: string; title: string; workflow_status?: string | null; occurred_at: string; last_activity_at?: string | null };
type WorkMetrics = {
  total: number; completed: number; notStarted: number; inProgress: number;
  internalReview: number; withClient: number;
};

export type DashboardData = {
  company: Company | null;
  profile: Profile | null;
  responsibles: AccountResponsibles | null;
  projects: Project[];
  deliverables: Deliverable[];
  events: EventItem[];
  minutes: number;
  hoursVisible: boolean;
  contractedHours: number;
  hoursLoadError: boolean;
  nps: number | null;
  npsCount: number;
  completionPct: number;
  workMetrics: WorkMetrics | null;
  unlinkedHourEntries: number;
  reportCount: number | null;
  latestDocument: ClientDocument | null;
  documentCount: number | null;
  openOccurrenceCount: number | null;
  latestOccurrence: ClientOccurrence | null;
  occurrenceLoadError: boolean;
};

export async function readClientHomeOverview(userId: string, nowIso: string, { start, end }: { start: string; end: string }): Promise<DashboardData> {
  if (!supabase) throw new Error('Conexão indisponível.');
  const profileResult = await supabase.from('profiles').select('full_name,company_id,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('id', userId).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  const companyId = profileResult.data?.company_id;
  if (!companyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');

  const [companyResult, deliveryReality, hoursResult, workResult, eventResult, reportResult, responsibles, documentsResult, occurrencesResult, latestOccurrenceResult] = await Promise.all([
    supabase.from('companies').select('id,display_name,logo_url,logo_workspace_url,service_type,service_plan,start_date,end_date,monthly_hours_contracted,show_hours_to_client').eq('id', companyId).single(),
    loadClientDashboardReality(companyId),
    supabase.rpc('get_client_hours_summary', { p_period_start: start, p_period_end: end }),
    supabase.rpc('get_client_home_work_metrics', { p_period_start: start, p_period_end: end }),
    supabase.from('events').select('id,title,starts_at,mode,meeting_url').eq('company_id', companyId).eq('visibility', 'client').is('cancelled_at', null).gte('starts_at', nowIso).order('starts_at').limit(3),
    supabase.from('reports').select('id').eq('company_id', companyId).in('status', ['sent', 'published']),
    readClientAccountResponsibles(),
    supabase.from('files').select('id,title,updated_at,category', { count: 'exact' }).eq('company_id', companyId).eq('client_visible', true).eq('status', 'published').order('updated_at', { ascending: false }).limit(1),
    supabase.from('account_records').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('visibility', 'client').in('record_type', ['occurrence', 'request', 'context_change', 'other']).in('workflow_status', ['open', 'in_progress', 'waiting_client', 'standby']),
    supabase.from('account_records').select('id,title,workflow_status,occurred_at,last_activity_at').eq('company_id', companyId).eq('visibility', 'client').in('record_type', ['occurrence', 'request', 'context_change', 'other']).order('last_activity_at', { ascending: false, nullsFirst: false }).order('occurred_at', { ascending: false }).limit(1),
  ]);

  if (companyResult.error) throw companyResult.error;
  if (eventResult.error) throw eventResult.error;
  if (workResult.error) throw workResult.error;
  const hoursSummary = (hoursResult.error ? null : hoursResult.data) as { visible?: boolean; contractedHours?: number; consumedMinutes?: number } | null;
  const workSummary = workResult.data as { ratings?: { average?: number | null; count?: number }; work?: WorkMetrics; unlinkedHourEntries?: number } | null;

  return {
    company: companyResult.data as Company,
    profile: profileResult.data as Profile,
    responsibles,
    projects: deliveryReality.projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      start_date: project.startDate,
      target_end_date: project.targetEndDate,
    })),
    deliverables: deliveryReality.deliverables.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      due_at: item.dueAt,
      project_id: item.projectId,
    })),
    events: (eventResult.data || []) as EventItem[],
    minutes: Number(hoursSummary?.consumedMinutes || 0),
    hoursVisible: hoursSummary?.visible === true,
    contractedHours: Number(hoursSummary?.contractedHours || 0),
    hoursLoadError: Boolean(hoursResult.error),
    nps: workSummary?.ratings?.average == null ? null : Number(workSummary.ratings.average),
    npsCount: Number(workSummary?.ratings?.count || 0),
    completionPct: workSummary?.work?.total ? Math.round(workSummary.work.completed / workSummary.work.total * 100) : 0,
    workMetrics: workSummary?.work || null,
    unlinkedHourEntries: Number(workSummary?.unlinkedHourEntries || 0),
    reportCount: reportResult.error ? null : (reportResult.data || []).length,
    latestDocument: documentsResult.error ? null : (documentsResult.data?.[0] as ClientDocument || null),
    documentCount: documentsResult.error ? null : documentsResult.count,
    openOccurrenceCount: occurrencesResult.error ? null : occurrencesResult.count,
    latestOccurrence: latestOccurrenceResult.error ? null : (latestOccurrenceResult.data?.[0] as ClientOccurrence || null),
    occurrenceLoadError: Boolean(latestOccurrenceResult.error),
  };
}
