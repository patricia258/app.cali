import { z } from 'zod';
import { supabase } from '../../supabase';

const rating = z.object({
  id: z.string(),
  companyId: z.string(),
  company: z.string(),
  companyLogoWorkspace: z.string().nullish(),
  companyLogoOriginal: z.string().nullish(),
  responderName: z.string().nullish(),
  responderAvatar: z.string().nullish(),
  score: z.number(),
  comment: z.string().nullish(),
  createdAt: z.string(),
  cohortAt: z.string().nullish().transform((value) => value ?? undefined),
  sourceType: z.enum(['record', 'deliverable']),
  entityId: z.string().nullish(),
  protocol: z.string().nullish(),
  title: z.string().nullish(),
});

const closure = z.object({
  id: z.string(),
  closed_at: z.string(),
  answered_at: z.string().nullable(),
  superseded_at: z.string().nullable(),
  closed_unanswered_at: z.string().nullable(),
  account_records: z.object({
    company_id: z.string(), title: z.string(),
    companies: z.object({ display_name: z.string() }).nullable(),
  }),
});

const followupFields = z.object({
  theme: z.string().nullable(), note: z.string().nullable(), handled_at: z.string(),
});
const followup = followupFields.extend({ source_type: z.enum(['record', 'deliverable']), response_id: z.string() });

export type SatisfactionReview = z.infer<typeof rating>;
export type SatisfactionClosure = z.infer<typeof closure>;

export const satisfactionRatingsKey = (actorId: string) => ['admin', 'satisfaction', 'ratings', actorId] as const;
export const satisfactionClosuresKey = (actorId: string) => ['admin', 'satisfaction', 'closures', actorId] as const;

export async function readSatisfactionClosures(signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const entries: SatisfactionClosure[] = [];
  const size = 250;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase.from('account_record_closures')
      .select('id,closed_at,answered_at,superseded_at,closed_unanswered_at,account_records!inner(company_id,title,companies(display_name))')
      .order('closed_at', { ascending: false }).order('id').range(offset, offset + size - 1).abortSignal(signal);
    if (error) throw new Error(error.message);
    entries.push(...z.array(closure).parse(data ?? []));
    if (!data || data.length < size) return entries;
  }
}

export async function readSatisfactionReviews(signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const [result, follow] = await Promise.all([
    supabase.rpc('get_admin_satisfaction_responses_v39').abortSignal(signal),
    supabase.from('satisfaction_followups').select('source_type,response_id,theme,note,handled_at').abortSignal(signal),
  ]);
  if (result.error) throw result.error;
  const followups = follow.error ? null : z.array(followup).safeParse(follow.data ?? []);
  return {
    ratings: z.array(rating).parse(result.data ?? []),
    followups: followups?.success ? Object.fromEntries(followups.data.map((row) => [
      `${row.source_type}:${row.response_id}`, { theme: row.theme, note: row.note, handledAt: row.handled_at },
    ])) : null,
  };
}

export async function closeFeedbackRequest(id: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('close_account_record_feedback_request', { p_closure_id: id });
  if (result.error) throw new Error(result.error.message);
}

export async function saveSatisfactionFollowup(
  review: Pick<SatisfactionReview, 'sourceType' | 'id' | 'companyId'>,
  fields: { theme: string | null; note: string | null },
) {
  if (!supabase) return { data: null, error: { message: 'Conexão indisponível.' } };
  const result = await supabase.from('satisfaction_followups').upsert({
    source_type: review.sourceType, response_id: review.id, company_id: review.companyId, ...fields,
  }, { onConflict: 'source_type,response_id' }).select('theme,note,handled_at').maybeSingle();
  if (result.error) return { data: null, error: result.error };
  const parsed = followupFields.nullable().safeParse(result.data);
  return { data: parsed.success ? parsed.data : null, error: null };
}

export async function deleteSatisfactionFollowup(review: Pick<SatisfactionReview, 'sourceType' | 'id'>) {
  if (!supabase) return { error: { message: 'Conexão indisponível.' } };
  return await supabase.from('satisfaction_followups').delete().eq('source_type', review.sourceType).eq('response_id', review.id);
}
