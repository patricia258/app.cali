import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

const accessSchema = z.object({
  name: z.string().trim().min(1),
  job: z.string().trim(),
  email: z.string().trim().min(1),
  phone: z.string().trim(),
  notes: z.string().trim(),
  ack: z.boolean().refine(Boolean),
});

export type AdditionalAccessDraft = z.infer<typeof accessSchema>;

export function isAdditionalAccessReady(draft: AdditionalAccessDraft) {
  return accessSchema.safeParse(draft).success;
}

export function useAdditionalAccessForm(available: boolean, onRequest: (draft: AdditionalAccessDraft) => Promise<void>) {
  return useForm({
    defaultValues: { name: '', job: '', email: '', phone: '', notes: '', ack: false },
    onSubmit: async ({ value }) => {
      const draft = accessSchema.safeParse(value);
      if (available && draft.success) await onRequest(draft.data);
    },
  });
}
