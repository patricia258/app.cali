import { z } from 'zod';
import { supabase } from '../../supabase';

const nullableText = z.string().nullish().transform((value) => value ?? null);
const readEvent = z.object({
  open_count: z.coerce.number().nullish(), first_opened_at: nullableText, last_opened_at: nullableText,
});
const receipt = z.object({
  acknowledged_at: nullableText, acknowledgement_protocol: nullableText, identity: z.unknown().optional(),
});
const report = z.looseObject({
  id: z.string(), title: z.string(), status: z.enum(['sent', 'published']),
});
const company = z.object({ display_name: nullableText, logo_url: nullableText, logo_workspace_url: nullableText });

export const clientReportsKey = (actorId: string) => ['client', 'reports', actorId] as const;

export async function readClientReports(actorId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const profile = await supabase.from('profiles').select('company_id').eq('id', actorId).abortSignal(signal).maybeSingle();
  if (profile.error) throw profile.error;
  const companyId = profile.data?.company_id;
  if (!companyId) throw new Error('Empresa vinculada ao acesso não encontrada.');
  const [companyResult, reports] = await Promise.all([
    supabase.from('companies').select('display_name,logo_url,logo_workspace_url').eq('id', companyId).abortSignal(signal).maybeSingle(),
    supabase.from('reports').select('id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,published_at,sent_at,version,approval_identity_snapshot,acknowledgement_identity_snapshot,acknowledged_at,acknowledgement_protocol,approved_at,client_open_count,client_first_opened_at,client_last_opened_at,client_pdf_count')
      .eq('company_id', companyId).in('status', ['sent', 'published']).order('period_start', { ascending: false })
      .order('version', { ascending: false }).abortSignal(signal),
  ]);
  if (companyResult.error) throw companyResult.error;
  if (reports.error) throw reports.error;
  return {
    company: company.nullable().parse(companyResult.data),
    reports: z.array(report).parse(reports.data ?? []),
  };
}

export async function recordReportRead(id: string, event: 'opened' | 'pdf_opened') {
  if (!supabase) return null;
  const result = await supabase.rpc('record_report_client_event_v55', { p_report_id: id, p_event_type: event });
  if (result.error) return null;
  const data = readEvent.safeParse(result.data);
  return data.data ?? null;
}

export async function acknowledgeClientReport(id: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('acknowledge_report_v55', { p_report_id: id });
  if (result.error) throw result.error;
  return receipt.safeParse(result.data).data ?? null;
}

const reportQuestionBody = z.string().trim().min(4).max(4000);
const reportQuestionReceipt = z.object({ ok: z.literal(true), record_protocol: nullableText });

export async function submitReportQuestion(reportId: string, message: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const body = reportQuestionBody.safeParse(message);
  if (!body.success) throw new Error('Escreva uma mensagem entre 4 e 4.000 caracteres.');
  const result = await supabase.rpc('client_submit_report_question_v61', {
    p_report_id: reportId, p_body: body.data,
  });
  if (result.error) throw new Error(result.error.message);
  return reportQuestionReceipt.parse(result.data);
}
