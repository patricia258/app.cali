import { z } from 'zod';

const optionalText = z.string().nullish();
const optionalNumber = z.union([z.number(), z.string()]).nullish();

export const reportContent = z.object({
  id: z.string(),
  title: z.string(),
  report_type: z.enum(['monthly', 'quarterly']).nullish(),
  period_start: optionalText,
  period_end: optionalText,
  reference_month: optionalText,
  executive_summary: optionalText,
  movements: z.json().optional(),
  decisions: z.json().optional(),
  risks: z.json().optional(),
  next_steps: z.json().optional(),
  source_snapshot: z.json().optional(),
  protocol: optionalText,
  sent_at: optionalText,
  version: optionalNumber,
});
