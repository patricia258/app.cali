import { z } from 'zod';
import { supabase } from '../supabase';

const printableReport = z.looseObject({
  id: z.string(),
  company_id: z.string(),
  report_type: z.string().nullish(),
  period_start: z.string().nullish(),
  reference_month: z.string().nullish(),
  executive_summary: z.string().nullish(),
  movements: z.json().optional(),
  decisions: z.json().optional(),
  risks: z.json().optional(),
  next_steps: z.json().optional(),
  source_snapshot: z.json().optional(),
  protocol: z.string().nullish(),
  version: z.union([z.number(), z.string()]).nullish(),
  approved_at: z.string().nullish(),
  acknowledged_at: z.string().nullish(),
  acknowledgement_protocol: z.string().nullish(),
});

export type PrintableReport = z.infer<typeof printableReport>;
export type ReportPrintRole = 'admin' | 'client' | 'staff';

export async function readPrintableReport(id: string, role: ReportPrintRole, signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  let companyId = '';
  if (role === 'client') {
    const user = await supabase.auth.getUser();
    if (user.error) throw user.error;
    const profile = await supabase.from('profiles').select('company_id')
      .eq('id', user.data.user?.id || '').abortSignal(signal).maybeSingle();
    if (profile.error) throw profile.error;
    companyId = profile.data?.company_id || '';
    if (!companyId) throw new Error('Empresa vinculada ao acesso não encontrada.');
  }

  let query = supabase.from('reports')
    .select('id,company_id,report_type,period_start,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,version,approval_identity_snapshot,acknowledgement_identity_snapshot,approved_at,acknowledged_at,acknowledgement_protocol')
    .eq('id', id);
  if (role === 'client') query = query.eq('company_id', companyId);
  if (role !== 'admin') query = query.in('status', ['sent', 'published']);
  const result = await query.abortSignal(signal).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Relatório não encontrado ou não disponível para este acesso.');
  return printableReport.parse(result.data);
}

export async function readPrintableReportCompany(companyId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('companies').select('display_name,logo_url')
    .eq('id', companyId).abortSignal(signal).maybeSingle();
  if (result.error) throw result.error;
  return z.object({ display_name: z.string().nullish(), logo_url: z.string().nullish() }).nullable().parse(result.data);
}
