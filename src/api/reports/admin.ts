import { format, subMonths } from 'date-fns';
import { z } from 'zod';
import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import type { DeliveryPerformanceRow, DismissedReportAlert } from '../../lib/reportV14';
import { supabase } from '../supabase';

const reportFields = 'id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at,version,revision_parent_id,dismissed_alerts,internal_note,data_refreshed_at,review_started_at,approved_at,sent_at,sent_to';
const readinessSchema = z.looseObject({
  mode: z.enum(['official', 'preview', 'simulation']),
  collected_days: z.number(),
  required_days: z.number(),
  available_on: z.string().nullish(),
  can_generate_official: z.boolean(),
  can_send: z.boolean(),
  official_report_id: z.string().nullish(),
  official_protocol: z.string().nullish(),
});
export type ReportReadiness = z.infer<typeof readinessSchema>;
export type FreshPeriodData = { snapshot: IntelligenceSnapshot; deliveries: DeliveryPerformanceRow[] };
type ReportPeriod = {
  companyId: string;
  type: ReportType;
  start: string;
  end: string;
};
type DraftReport = {
  company_id: string;
  title: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  reference_month: string;
  status: 'draft';
  version: number;
  revision_parent_id: string | null;
  executive_summary: string;
  movements: string[];
  decisions: string[];
  risks: string[];
  next_steps: string[];
  source_snapshot: IntelligenceSnapshot;
  service_type_snapshot: string | null;
  service_plan_snapshot: string | null;
  contracted_hours_snapshot: number | null;
  data_refreshed_at: string;
  dismissed_alerts: DismissedReportAlert[];
  internal_note: string | null;
};
type EditorialChanges = {
  editor: ReportEditor;
  internalNote: string;
  dismissedAlerts: DismissedReportAlert[];
  snapshot: IntelligenceSnapshot | null;
};

function database() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}
function lines(value: string) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}
function editorialPatch({ editor, internalNote, dismissedAlerts, snapshot }: EditorialChanges) {
  return {
    executive_summary: editor.summary,
    movements: lines(editor.movements),
    decisions: lines(editor.decisions),
    risks: lines(editor.risks),
    next_steps: lines(editor.nextSteps),
    internal_note: internalNote,
    dismissed_alerts: dismissedAlerts,
    source_snapshot: snapshot,
  };
}

export async function readReportPortfolio() {
  const db = database();
  const [companies, reports] = await Promise.all([
    db.from('companies').select('id,display_name,logo_url,logo_workspace_url,service_type,service_plan')
      .neq('status', 'closed').order('display_name'),
    db.from('reports').select(reportFields).order('period_start', { ascending: false }).order('version', { ascending: false }),
  ]);
  if (companies.error) throw companies.error;
  if (reports.error) throw reports.error;
  return { companies: companies.data ?? [], reports: reports.data ?? [] };
}

export async function readFreshReportPeriod(companyId: string, type: ReportType, start: string, end: string): Promise<FreshPeriodData> {
  const db = database();
  const [year, month] = start.split('-').map(Number);
  const seriesStart = type === 'quarterly' ? start : format(subMonths(new Date(year, month - 1, 1), 5), 'yyyy-MM-dd');
  const [snapshot, series, performance] = await Promise.all([
    db.rpc('build_report_intelligence_snapshot', { p_company_id: companyId, p_period_start: start, p_period_end: end }),
    db.rpc('build_report_monthly_series', { p_company_id: companyId, p_period_start: seriesStart, p_period_end: end }),
    db.from('deliverable_delivery_performance')
      .select('deliverable_id,company_id,project_id,protocol,title,status,workstream,planned_start_date,actual_started_at,original_due_at,effective_due_at,work_closed_at,work_close_reason,approved_at,client_response_at,completion_at,delivery_timing,business_days_from_deadline,start_timing,business_days_from_original_deadline,total_minutes')
      .eq('company_id', companyId),
  ]);
  if (snapshot.error) throw snapshot.error;
  if (series.error) throw series.error;
  if (performance.error) throw performance.error;
  const fresh = normalizeIntelligenceSnapshot({ ...((snapshot.data || {}) as object), monthlySeries: series.data });
  if (!fresh) throw new Error('A memória automática do período retornou em formato inválido.');
  return { snapshot: fresh, deliveries: (performance.data || []) as DeliveryPerformanceRow[] };
}

export async function readReportReadiness(companyId: string, type: ReportType, start: string, end: string) {
  const result = await supabase?.rpc('report_generation_readiness_v61', {
    p_company_id: companyId, p_report_type: type, p_period_start: start, p_period_end: end,
  });
  if (!result || result.error) return null;
  return readinessSchema.safeParse(result.data).data ?? null;
}

export async function readCurrentReportPeriod(companyId: string, type: ReportType, start: string, end: string) {
  const result = await database().from('reports').select(reportFields)
    .eq('company_id', companyId).eq('report_type', type).eq('period_start', start).eq('period_end', end)
    .neq('status', 'archived').order('version', { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function createReportDraft(payload: DraftReport, mode: 'official' | 'simulation') {
  const db = database();
  const result = await db.from('reports').insert(payload).select('id').single();
  if (result.error) throw result.error;
  await db.from('activity_log').insert({
    company_id: payload.company_id,
    event_type: mode === 'simulation' ? 'report_simulation_generated' : 'report_draft_generated',
    entity_type: 'report',
    entity_id: result.data.id,
    metadata: {
      report_type: payload.report_type, period_start: payload.period_start, period_end: payload.period_end,
      version: payload.version, generation_mode: mode, explicit_user_action: true,
    },
  });
}

export async function saveReportEditorialDraft(id: string, changes: EditorialChanges) {
  const result = await database().from('reports').update(editorialPatch(changes)).eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

export async function refreshReportFacts(id: string, snapshot: IntelligenceSnapshot, contract: {
  serviceType: string | null; servicePlan: string | null; contractedHours: number | null;
}) {
  const result = await database().from('reports').update({
    source_snapshot: snapshot,
    data_refreshed_at: new Date().toISOString(),
    service_type_snapshot: contract.serviceType,
    service_plan_snapshot: contract.servicePlan,
    contracted_hours_snapshot: contract.contractedHours,
  }).eq('id', id);
  if (result.error) throw result.error;
}

export async function startReportReview(id: string) {
  const result = await database().from('reports')
    .update({ status: 'review', review_started_at: new Date().toISOString() }).eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

export async function approveExecutiveReport(id: string, version: number, period: ReportPeriod, changes: EditorialChanges) {
  const db = database();
  const user = await db.auth.getUser();
  if (user.error) throw user.error;
  const result = await db.from('reports').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: user.data.user?.id || null,
    ...editorialPatch(changes),
  }).eq('id', id);
  if (result.error) throw result.error;
  await db.from('activity_log').insert({
    company_id: period.companyId, event_type: 'report_approved', entity_type: 'report', entity_id: id,
    metadata: { version, period_start: period.start, period_end: period.end },
  });
}

export async function readReportRecipients(companyId: string) {
  const result = await database().from('profiles').select('email,full_name,is_primary')
    .eq('company_id', companyId).eq('role', 'client').eq('active', true).order('is_primary', { ascending: false });
  return (result.data || []).flatMap((person) => person.email ? [person.email] : []);
}

const deliveryReceipt = z.object({ ok: z.literal(true), email_id: z.string().min(1) });

export async function deliverExecutiveReport(id: string, version: number, requestId: string, recipients: string[], message: string) {
  const result = await database().functions.invoke('workspace-send-executive-report', {
    body: { report_id: id, request_id: requestId, version, recipients, message },
  });
  if (result.error || !deliveryReceipt.safeParse(result.data).success) {
    throw new Error('Não foi possível confirmar o envio do relatório.');
  }
}

export async function deleteReportDraft(id: string) {
  const result = await database().from('reports').delete().eq('id', id).in('status', ['draft', 'review']);
  if (result.error) throw new Error(result.error.message);
}
