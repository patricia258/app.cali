import { z } from 'zod';
import { supabase } from '../supabase';

const optionalText = z.string().nullish().transform((value) => value ?? null);
const notice = z.object({
  id: z.string(), title: z.string(), body: optionalText, action_url: optionalText,
  created_at: z.string(), notification_type: optionalText,
});
const report = z.object({
  id: z.string(), company_id: optionalText, title: z.string(), protocol: optionalText, status: z.string(), period_end: optionalText,
});
const review = z.object({
  id: z.string(), company_id: z.string(), kind: z.string(), title: z.string(), note: optionalText,
  status: z.string(), decision_note: optionalText, created_at: z.string(),
});
const hoursSubmission = review.pick({ id: true, company_id: true, status: true, decision_note: true, created_at: true })
  .extend({ description: z.string(), minutes: z.number() });

export type PartnerNotification = z.infer<typeof notice>;
export type PartnerReview = z.infer<typeof review>;

export async function readPartnerNotifications(actorId: string) {
  if (!supabase) return null;
  const result = await supabase.from('notifications').select('id,title,body,action_url,created_at,notification_type')
    .eq('user_id', actorId).order('created_at', { ascending: false }).limit(15);
  return result.error ? null : z.array(notice).safeParse(result.data ?? []).data ?? null;
}

export async function recordPartnerSession(event: 'staff_session_started' | 'staff_session_ended') {
  await supabase?.rpc('staff_log_session', { p_event: event });
}

export async function readPartnerReports() {
  if (!supabase) return null;
  const result = await supabase.from('reports').select('id,company_id,title,protocol,status,period_end')
    .order('period_end', { ascending: false }).limit(200);
  return result.error ? null : z.array(report).safeParse(result.data ?? []).data ?? null;
}

export async function readPartnerReviews() {
  if (!supabase) return { reviews: [], submissions: [] };
  const [reviews, submissions] = await Promise.all([
    supabase.from('staff_review_requests').select('id,company_id,kind,title,note,status,decision_note,created_at')
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('staff_hour_submissions').select('id,company_id,minutes,description,status,decision_note,created_at')
      .order('created_at', { ascending: false }).limit(200),
  ]);
  return {
    reviews: z.array(review).safeParse(reviews.data ?? []).data ?? [],
    submissions: z.array(hoursSubmission).safeParse(submissions.data ?? []).data ?? [],
  };
}

export async function readPartnerOverview(modules: string[]) {
  const client = supabase;
  if (!client) return null;
  const has = (key: string) => modules.includes(key);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const empty = { data: [] };
  const [deliverables, events, records, hours, pendingHours, pendingReviews] = await Promise.all([
    has('projects') ? client.from('deliverables').select('id,company_id,title,status,due_at').is('cancelled_at', null).limit(500) : empty,
    has('calendar') ? client.from('events').select('id,company_id,title,starts_at,event_type').is('cancelled_at', null)
      .gte('starts_at', now.toISOString()).order('starts_at').limit(6) : empty,
    has('records') ? client.from('account_records').select('id,company_id,title,workflow_status,last_activity_at')
      .eq('visibility', 'client').order('last_activity_at', { ascending: false, nullsFirst: false }).limit(200) : empty,
    has('hours') ? client.rpc('partner_hours_summary', { p_month: monthStart }) : empty,
    client.from('staff_hour_submissions').select('id').eq('status', 'pending'),
    client.from('staff_review_requests').select('id').eq('status', 'pending'),
  ]);
  const usage = z.array(z.object({ company_id: z.string(), minutes: z.coerce.number().nullish() })).safeParse(hours.data ?? []).data ?? [];
  const minutes = usage.reduce<Record<string, number>>((map, row) => {
    map[row.company_id] = (map[row.company_id] || 0) + (row.minutes || 0);
    return map;
  }, {});
  return {
    deliverables: deliverables.data ?? [], events: events.data ?? [], records: records.data ?? [], minutes,
    pendingHours: pendingHours.data?.length ?? 0, pendingReviews: pendingReviews.data?.length ?? 0,
  };
}
