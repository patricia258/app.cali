import { z } from 'zod';
import { supabase } from '../supabase';

const historyEventSchema = z.object({
  id: z.string(),
  kind: z.string(),
  happened_at: z.string(),
  title: z.string(),
  subject_type: z.enum(['record', 'delivery']),
  subject_id: z.string(),
  subject_title: z.string(),
  minutes: z.number().nullable(),
});

export type HistoryEvent = z.infer<typeof historyEventSchema>;

export async function readCompanyConversationHistory(
  companyId: string,
  kind: string,
  cursor: Pick<HistoryEvent, 'id' | 'happened_at'> | null,
  signal: AbortSignal,
) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('read_company_conversation_history', {
    p_company_id: companyId,
    p_kind: kind || null,
    p_before_at: cursor?.happened_at ?? null,
    p_before_id: cursor?.id ?? null,
  }).abortSignal(signal);
  if (error) throw error;
  return z.array(historyEventSchema).parse(data ?? []);
}
