import { z } from 'zod';
import { supabase } from '../../supabase';

const hoursSummary = z.object({
  visible: z.boolean().optional(),
  contractedHours: z.coerce.number().nullish(),
  consumedMinutes: z.coerce.number().nullish(),
  remainingMinutes: z.coerce.number().nullish(),
  overMinutes: z.coerce.number().nullish(),
  usagePercent: z.coerce.number().nullish(),
}).transform((raw) => ({
  visible: raw.visible === true,
  contractedHours: raw.contractedHours ?? 0,
  consumedMinutes: raw.consumedMinutes ?? 0,
  remainingMinutes: raw.remainingMinutes ?? 0,
  overMinutes: raw.overMinutes ?? 0,
  usagePercent: raw.usagePercent ?? null,
}));

const project = z.object({ id: z.string(), name: z.string() });
const delivery = z.object({
  id: z.string(), project_id: z.string().nullish(), title: z.string(), workstream: z.string().nullish(),
});
const extractRow = z.object({
  kind: z.string(), project_name: z.string().nullish(), item_title: z.string(),
  protocol: z.string().nullish(), front: z.string().nullish(), minutes: z.coerce.number().nullish(),
});
const capacity = z.object({ occurrence: z.coerce.number().nullish(), paused: z.boolean().nullish() });
const companyPlan = z.object({ service_plan: z.string().nullish() });

export const clientHoursKey = (actorId: string, period: string) => ['client', 'hours', actorId, period] as const;

export async function readClientHours(actorId: string, start: string, end: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const profile = await supabase.from('profiles').select('company_id').eq('id', actorId).abortSignal(signal).maybeSingle();
  if (profile.error) throw profile.error;
  const companyId = profile.data?.company_id;
  if (!companyId) throw new Error('Empresa vinculada ao acesso não encontrada.');

  const [summary, projects, deliverables, entries, status, company] = await Promise.all([
    supabase.rpc('get_client_hours_summary', { p_period_start: start, p_period_end: end }).abortSignal(signal),
    supabase.from('projects').select('id,name').eq('company_id', companyId).neq('status', 'cancelled').order('name').abortSignal(signal),
    supabase.from('deliverables').select('id,project_id,title,workstream').eq('company_id', companyId).eq('client_visible', true).neq('status', 'cancelled').order('title').abortSignal(signal),
    supabase.rpc('get_client_hours_breakdown', { p_period_start: start, p_period_end: end }).abortSignal(signal),
    supabase.rpc('get_client_capacity_status', { p_month: start }).abortSignal(signal),
    supabase.from('companies').select('service_plan').eq('id', companyId).abortSignal(signal).maybeSingle(),
  ]);
  if (summary.error) throw summary.error;
  if (projects.error) throw projects.error;
  if (deliverables.error) throw deliverables.error;
  if (entries.error) throw entries.error;
  const statusResult = capacity.safeParse(status.data);
  const planResult = companyPlan.safeParse(company.data);
  return {
    summary: hoursSummary.parse(summary.data ?? {}),
    projects: z.array(project).parse(projects.data ?? []),
    deliverables: z.array(delivery).parse(deliverables.data ?? []).map((row) => ({
      id: row.id, projectId: row.project_id, title: row.title, workstream: row.workstream || null,
    })),
    rows: z.array(extractRow).parse(entries.data ?? []).map((row) => ({
      kind: row.kind, project: row.project_name ?? null, title: row.item_title,
      protocol: row.protocol ?? null, front: row.front ?? null, minutes: row.minutes ?? 0,
    })),
    status: { occurrence: statusResult.data?.occurrence ?? 0, paused: statusResult.data?.paused ?? false },
    plan: planResult.data?.service_plan || '',
  };
}
