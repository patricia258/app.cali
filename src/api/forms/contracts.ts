import { z } from 'zod';

const questionSchema = z.object({
  id: z.string(),
  kind: z.enum(['name', 'email', 'phone', 'short_text', 'long_text', 'single_choice', 'multi_choice', 'scale', 'yes_no', 'date', 'number', 'file', 'statement']),
  label: z.string(),
  help: z.string().nullish().transform((value) => value ?? undefined),
  required: z.boolean().nullish().transform((value) => value ?? undefined),
  options: z.array(z.string()).nullish().transform((value) => value ?? undefined),
  scaleMin: z.number().nullish().transform((value) => value ?? undefined),
  scaleMax: z.number().nullish().transform((value) => value ?? undefined),
  minLabel: z.string().nullish().transform((value) => value ?? undefined),
  maxLabel: z.string().nullish().transform((value) => value ?? undefined),
  logic: z.array(z.object({ when: z.string(), goTo: z.string() })).nullish().transform((value) => value ?? undefined),
  accept: z.enum(['images_pdf', 'any']).nullish().transform((value) => value ?? undefined),
});

export const formContentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullish().transform((value) => value ?? ''),
  thank_you: z.string().nullish().transform((value) => value ?? ''),
  status: z.enum(['draft', 'open', 'closed']),
  confirm_email: z.boolean().nullish().transform((value) => value ?? false),
  category: z.string().nullish().transform((value) => value ?? ''),
  submit_label: z.string().nullish(),
  success_text: z.string().nullish(),
  questions: z.array(questionSchema),
});

export type PublicForm = z.infer<typeof formContentSchema>;

export const formContentColumns = 'id,slug,title,description,thank_you,status,confirm_email,category,submit_label,success_text,questions';
