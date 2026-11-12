import { z } from 'zod';
import { anonPublicRpc, anonStorage, supabase } from '../supabase';
import { formContentColumns, formContentSchema } from './contracts';

const submissionReceipt = z.object({ ok: z.boolean(), confirmation: z.boolean().optional() });

export async function readPublicForm(slug: string, preview: boolean) {
  const published = await anonPublicRpc('cali_form_public', { p_slug: slug });
  const result = formContentSchema.safeParse(published.data);

  if (preview && supabase) {
    const own = await supabase.from('forms').select(formContentColumns)
      .eq('slug', slug.toLowerCase()).maybeSingle();
    const draft = formContentSchema.safeParse(own.data);
    if (draft.success) return { ...draft.data, status: 'open' } as const;
  }

  return result.success ? result.data : null;
}

export async function submitPublicForm(
  form: { id: string; slug: string },
  answers: Record<string, string | number | string[]>,
  requestId: string,
) {
  const result = await anonPublicRpc('cali_form_submit', {
    p_slug: form.slug, p_answers: answers, p_form_id: form.id, p_request_id: requestId,
  });
  if (result.error) throw new Error(result.error.message);
  const receipt = submissionReceipt.safeParse(result.data);
  if (!receipt.success || !receipt.data.ok) throw new Error('Não foi possível enviar agora.');
  return Boolean(receipt.data.confirmation);
}

export async function uploadPublicFormAttachment(path: string, file: File) {
  if (!anonStorage) return false;
  const result = await anonStorage.from('cali-forms').upload(path, file, { contentType: file.type || undefined, upsert: false });
  return !result.error;
}
