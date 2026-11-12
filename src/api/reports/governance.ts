import type { JsonObject } from '../../domain/json';
import type { ReportType } from '../../lib/reportComposition';
import { supabase } from '../supabase';

const reportFields = 'id,company_id,report_type,period_start,period_end,status,version,source_snapshot,client_open_count,acknowledged_at';
export type GovernanceReport = {
  id: string;
  company_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  status: string;
  version: number;
  source_snapshot: JsonObject | null;
  client_open_count?: number | null;
  acknowledged_at?: string | null;
};
export type GovernancePeriod = { companyId: string; reportType: ReportType; start: string; end: string };

export async function readGovernancePeriodReports(filters: GovernancePeriod): Promise<GovernanceReport[]> {
  if (!supabase) return [];
  const result = await supabase.from('reports').select(reportFields)
    .eq('company_id', filters.companyId).eq('report_type', filters.reportType)
    .eq('period_start', filters.start).eq('period_end', filters.end).neq('status', 'archived')
    .order('version', { ascending: false });
  return result.error ? [] : result.data ?? [];
}

export async function markReportSimulation(current: GovernanceReport, officialId: string) {
  if (!supabase) return null;
  const snapshot = current.source_snapshot && typeof current.source_snapshot === 'object' ? current.source_snapshot : {};
  if (snapshot.workflow_mode === 'simulation') return snapshot;
  const next = { ...snapshot, workflow_mode: 'simulation', simulation_of: officialId, simulation_marked_at: new Date().toISOString() };
  const result = await supabase.from('reports').update({ source_snapshot: next })
    .eq('id', current.id).in('status', ['draft', 'review']);
  return result.error ? null : next;
}

export async function readGovernanceHistory(companyId: string): Promise<GovernanceReport[] | null> {
  if (!supabase) return null;
  const result = await supabase.from('reports').select(reportFields)
    .eq('company_id', companyId).neq('status', 'archived').order('period_start', { ascending: false })
    .order('version', { ascending: false }).limit(12);
  return result.error ? null : result.data ?? [];
}
