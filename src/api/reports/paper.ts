import type { ReportIdentityV55 } from '../../domain/report-identity';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { supabase } from '../supabase';

export async function readReportPaperIdentity(protocol: string, signal: AbortSignal) {
  if (!supabase) return null;
  const result = await supabase.from('reports')
    .select('company_id,period_start,period_end,approval_identity_snapshot,acknowledgement_identity_snapshot,approved_at,acknowledged_at,acknowledgement_protocol')
    .eq('protocol', protocol).abortSignal(signal).maybeSingle();
  if (result.error || !result.data) return null;
  const row = result.data;
  const company = await supabase.from('companies').select('logo_url').eq('id', row.company_id).abortSignal(signal).maybeSingle();
  const logo = !company.error && company.data?.logo_url ? await resolveWorkspaceMedia(company.data.logo_url, 86400, true) : '';
  return {
    companyId: row.company_id as string,
    start: row.period_start as string,
    end: row.period_end as string,
    approvalIdentity: (row.approval_identity_snapshot as ReportIdentityV55 | null) || null,
    acknowledgementIdentity: (row.acknowledgement_identity_snapshot as ReportIdentityV55 | null) || null,
    approvedAt: (row.approved_at as string | null) || null,
    acknowledgedAt: (row.acknowledged_at as string | null) || null,
    acknowledgementProtocol: (row.acknowledgement_protocol as string | null) || null,
    logoUrl: logo || null,
  };
}

export type ReportVisitCost = { id: string; label: string; amountCents: number; protocol: string };
const expenseLabels: Record<string, string> = {
  transport: 'Deslocamento', parking: 'Estacionamento', food: 'Alimentação', extra_hours: 'Horas adicionais',
};

export async function readReportVisitCosts(identity: NonNullable<Awaited<ReturnType<typeof readReportPaperIdentity>>>, signal: AbortSignal): Promise<ReportVisitCost[]> {
  if (!supabase) return [];
  const result = await supabase.from('scheduling_requests')
    .select('id,title,status,extra_visit_fee_cents,extra_visit_cancellation_fee_cents')
    .eq('company_id', identity.companyId).eq('extra_visit', true)
    .gte('extra_visit_billing_period', identity.start).lte('extra_visit_billing_period', identity.end).abortSignal(signal);
  if (result.error) throw result.error;
  const visits = result.data ?? [];
  const costs: ReportVisitCost[] = visits.filter((visit) => visit.status === 'completed').map((visit) => ({
    id: `visit-${visit.id}`, label: `${visit.title} · visita de até 4h`,
    amountCents: Number(visit.extra_visit_fee_cents || 80000), protocol: visit.id.slice(0, 8).toUpperCase(),
  }));
  for (const visit of visits) {
    if (Number(visit.extra_visit_cancellation_fee_cents || 0) <= 0) continue;
    costs.push({
      id: `visit-change-${visit.id}`, label: `${visit.title} · alteração avaliada pela CALI`,
      amountCents: Number(visit.extra_visit_cancellation_fee_cents), protocol: visit.id.slice(0, 8).toUpperCase(),
    });
  }
  if (!visits.length) return costs;
  let query = supabase.from('extra_visit_expenses')
    .select('id,request_id,expense_kind,amount_cents,protocol,created_at,hours_quantity').in('request_id', visits.map((visit) => visit.id));
  if (identity.approvedAt) query = query.lte('created_at', identity.approvedAt);
  const expenses = await query.abortSignal(signal);
  if (!expenses.error) {
    for (const expense of expenses.data ?? []) {
      costs.push({
        id: expense.id,
        label: (expenseLabels[expense.expense_kind] ?? expense.expense_kind) + (expense.hours_quantity ? ` · ${expense.hours_quantity}h` : ''),
        amountCents: expense.amount_cents,
        protocol: expense.protocol || '—',
      });
    }
  }
  return costs;
}
