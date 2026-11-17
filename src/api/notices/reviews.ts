import { z } from 'zod';
import { supabase } from '../supabase';

const review = z.object({
  id: z.string(), revision: z.number(), category: z.string(), title: z.string(), body: z.string(),
  company_ids: z.array(z.string()), notice_date: z.string().nullish().transform((value) => value ?? null),
  status: z.enum(['pending', 'returned', 'published']),
  review_note: z.string().nullish().transform((value) => value ?? null),
});
export type NoticeReview = z.infer<typeof review>;

const columns = 'id,revision,category,title,body,company_ids,notice_date,status,review_note';
const unavailable = 'Conexão indisponível.';

export async function readPendingNoticeReviews() {
  if (!supabase) return [];
  const result = await supabase.from('partner_notice_reviews').select(columns)
    .eq('status', 'pending').order('submitted_at').order('id');
  if (result.error) throw new Error(result.error.message);
  return z.array(review).parse(result.data ?? []);
}

export async function readPartnerNoticeReviews(actorId: string) {
  if (!supabase) return [];
  const result = await supabase.from('partner_notice_reviews').select(columns)
    .eq('author_id', actorId).order('submitted_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return z.array(review).parse(result.data ?? []);
}

export async function submitNoticeReview(draft: {
  requestId: string; id: string | null; revision: number | null; category: string;
  title: string; body: string; companies: string[]; date: string;
}) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('submit_partner_notice_review', {
    p_request_id: draft.requestId, p_review_id: draft.id, p_revision: draft.revision,
    p_category: draft.category, p_title: draft.title, p_body: draft.body,
    p_companies: draft.companies, p_date: draft.date || null,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function decideNoticeReview(record: Pick<NoticeReview, 'id' | 'revision'>, approve: boolean, note: string) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('review_partner_notice', {
    p_review_id: record.id, p_revision: record.revision, p_approve: approve, p_note: approve ? null : note.trim(),
  });
  if (result.error) throw new Error(result.error.message);
}
