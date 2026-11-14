import type { JsonValue } from '../../domain/json';
import { z } from 'zod';
import { requireHoursClient } from './client';

const overviewRow = z.object({
  company_id: z.string(), contracted_minutes: z.coerce.number(), used_minutes: z.coerce.number(),
  excess_months: z.coerce.number(), window_months: z.coerce.number(), paused: z.boolean(), events: z.array(z.string()),
});
const historyRow = z.object({ month: z.string(), contracted_minutes: z.coerce.number(), used_minutes: z.coerce.number() });
const reviewRow = z.object({
  id: z.string(), company_id: z.string(), analysis: z.string(), decision: z.string(), communicated: z.boolean(), created_at: z.string(),
});
const overviewRows = z.array(overviewRow);
const historyRows = z.array(historyRow);
const reviewRows = z.array(reviewRow);
const reviewColumns = 'id,company_id,analysis,decision,communicated,created_at';

export type CapacityOverviewRow = z.infer<typeof overviewRow>;
export type CapacityHistoryRow = z.infer<typeof historyRow>;
export type CapacityReview = z.infer<typeof reviewRow>;
type ReviewDraft = Pick<CapacityReview, 'analysis' | 'decision' | 'communicated'>;

function parseCapacity<Schema extends z.ZodType>(schema: Schema, response: { data: JsonValue | undefined; error: { message: string } | null }) {
  if (response.error) return { data: null, error: response.error };
  const parsed = schema.safeParse(response.data);
  if (!parsed.success) return { data: null, error: { message: 'O Workspace retornou dados de capacidade inválidos.' } };
  return { data: parsed.data, error: null };
}

export async function readCapacityOverview(month: string) {
  const result = await requireHoursClient().rpc('admin_capacity_overview', { p_month: month });
  return parseCapacity(overviewRows, { ...result, data: result.data ?? [] });
}

export async function readCapacityDetails(companyId: string, month: string) {
  const client = requireHoursClient();
  const [past, notes] = await Promise.all([
    client.rpc('admin_capacity_history', { p_company_id: companyId, p_month: month }),
    client.from('capacity_reviews').select(reviewColumns).eq('company_id', companyId)
      .order('created_at', { ascending: false }).limit(5),
  ]);
  return {
    past: parseCapacity(historyRows, { ...past, data: past.data ?? [] }),
    notes: parseCapacity(reviewRows, { ...notes, data: notes.data ?? [] }),
  };
}

export async function recordCapacityReview(companyId: string, month: string, draft: ReviewDraft) {
  const client = requireHoursClient();
  const { data: auth } = await client.auth.getUser();
  const result = await client.from('capacity_reviews').insert({
    company_id: companyId, month, analysis: draft.analysis.trim(), decision: draft.decision,
    communicated: draft.communicated, created_by: auth.user?.id || null,
  }).select(reviewColumns).single();
  return parseCapacity(reviewRow, result);
}

export async function pauseCompanyCapacity(companyId: string, month: string) {
  const client = requireHoursClient();
  const { data: auth } = await client.auth.getUser();
  return await client.from('capacity_pauses').upsert({
    company_id: companyId, month, paused_by: auth.user?.id || null, paused_at: new Date().toISOString(),
    resumed_at: null, resumed_by: null,
  }, { onConflict: 'company_id,month' });
}

export async function resumeCompanyCapacity(companyId: string, month: string) {
  const client = requireHoursClient();
  const { data: auth } = await client.auth.getUser();
  return await client.from('capacity_pauses').update({ resumed_at: new Date().toISOString(), resumed_by: auth.user?.id || null })
    .eq('company_id', companyId).eq('month', month);
}
