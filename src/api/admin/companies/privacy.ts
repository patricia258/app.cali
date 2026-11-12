import { z } from 'zod';
import { supabase } from '../../supabase';

const request = z.object({
  id: z.string(),
  user_id: z.string(),
  company_id: z.string().nullish(),
  kind: z.string(),
  details: z.string(),
  status: z.string(),
  answer: z.string().nullish(),
  created_at: z.string(),
  resolved_at: z.string().nullish(),
});
export type PrivacyRequest = z.infer<typeof request>;

export async function readPrivacyRequests(signal?: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  let query = supabase.from('data_subject_requests').select('*').order('created_at', { ascending: false }).limit(50);
  if (signal) query = query.abortSignal(signal);
  const result = await query;
  if (result.error) throw result.error;
  const rows = z.array(request).parse(result.data ?? []);
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const companyIds = [...new Set(rows.flatMap((row) => row.company_id ? [row.company_id] : []))];
  const profiles = userIds.length ? supabase.from('profiles').select('id,full_name,email').in('id', userIds) : null;
  const companies = companyIds.length ? supabase.from('companies').select('id,display_name').in('id', companyIds) : null;
  const [people, accounts] = await Promise.all([
    signal ? profiles?.abortSignal(signal) : profiles,
    signal ? companies?.abortSignal(signal) : companies,
  ]);
  return {
    rows,
    names: Object.fromEntries((people?.data ?? []).map((row) => [row.id, row.full_name || row.email])),
    companies: Object.fromEntries((accounts?.data ?? []).map((row) => [row.id, row.display_name])),
  };
}

export async function answerPrivacyRequest(id: string, text: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('admin_answer_data_subject_request', { p_request_id: id, p_answer: text });
  if (result.error) throw new Error(result.error.message || 'Não foi possível registrar a resposta.');
}
