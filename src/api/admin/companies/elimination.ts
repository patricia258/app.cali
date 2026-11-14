import { z } from 'zod';
import { supabase } from '../../supabase';

export const ELIMINATION_DAYS = 30;

const receiptSchema = z.object({
  rows_removed: z.record(z.string(), z.number()),
  people_anonymized: z.number(),
  files_removed: z.number(),
});
const jobSchema = z.object({
  jobId: z.uuid(),
  state: z.enum(['queued', 'running', 'retry', 'completed']),
  filesPending: z.number(),
  receipt: receiptSchema.nullable(),
});
const previewSchema = z.object({
  deadlineAt: z.string(),
  due: z.boolean(),
  files: z.number(),
  externalCopies: z.boolean(),
  job: jobSchema.nullable(),
});

export type CompanyEliminationPreview = z.infer<typeof previewSchema>;

export function eliminationDeadlineDate(closedAt: string) {
  return new Date(Date.parse(closedAt) + ELIMINATION_DAYS * 24 * 60 * 60 * 1000);
}

export async function previewCompanyElimination(companyId: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('admin_preview_company_elimination', { p_company: companyId });
  if (result.error) throw new Error(result.error.message);
  return previewSchema.parse(result.data);
}

export async function eliminateCompanyData(companyId: string, confirmName: string, copiesReviewed: boolean) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('admin_begin_company_elimination', {
    p_company: companyId, p_confirm_name: confirmName, p_copies_reviewed: copiesReviewed,
  });
  if (result.error) throw new Error(result.error.message);
  const registered = jobSchema.parse(result.data);
  if (registered.state === 'completed') return registered;

  const invocation = await supabase.functions.invoke('workspace-company-elimination', {
    body: { jobId: registered.jobId },
  });
  if (invocation.error) throw new Error('A autorização foi registrada. O executor está indisponível. Tente retomar a operação.');
  const current = await supabase.rpc('admin_read_company_elimination_job', { p_job: registered.jobId });
  if (current.error) throw new Error(current.error.message);
  return jobSchema.parse(current.data);
}
