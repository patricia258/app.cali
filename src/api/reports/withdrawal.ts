import { z } from 'zod';
import { supabase } from '../supabase';

const withdrawable = z.object({
  id: z.string(),
  protocol: z.string().nullish(),
  status: z.string(),
  client_open_count: z.coerce.number().nullish(),
  client_first_opened_at: z.string().nullish(),
  acknowledged_at: z.string().nullish(),
  withdrawn_at: z.string().nullish(),
});
export type WithdrawableReport = z.infer<typeof withdrawable>;

export async function readWithdrawableReports() {
  if (!supabase) return null;
  const result = await supabase.from('reports')
    .select('id,protocol,status,client_open_count,client_first_opened_at,acknowledged_at,withdrawn_at')
    .in('status', ['sent', 'published']).order('period_start', { ascending: false }).limit(60);
  if (result.error) return null;
  return z.array(withdrawable).safeParse(result.data ?? []).data ?? null;
}

export async function correctDeliveredReport(id: string, reason: string, action: 'edit' | 'remove', askAcknowledgement: boolean) {
  if (!supabase) return { revisionId: null, error: 'Conexão indisponível.' };
  const result = action === 'edit'
    ? await supabase.rpc('revise_delivered_report', { p_report_id: id, p_reason: reason, p_request_acknowledgement: askAcknowledgement })
    : await supabase.rpc('withdraw_unopened_report_v62', { p_report_id: id, p_reason: reason || null });
  return { revisionId: action === 'edit' && typeof result.data === 'string' ? result.data : null, error: result.error?.message };
}
