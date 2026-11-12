import { z } from 'zod';
import { anonPublicRpc } from '../supabase';

const field = z.string().trim().min(1).max(200);
export const preRegistrationFieldsSchema = z.object({
  name: field,
  legalName: field,
  city: field,
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  contact: field,
  email: z.email().max(254),
});

export type PreRegistrationFields = z.infer<typeof preRegistrationFieldsSchema>;

export async function readPreRegistration(token: string) {
  const result = await anonPublicRpc('cali_read_company_pre_registration', { p_token: z.uuid().parse(token) });
  if (result.error) throw new Error(result.error.message);
  return z.enum(['open', 'submitted', 'missing']).parse(result.data);
}

export async function submitPreRegistration(token: string, fields: PreRegistrationFields) {
  const parsed = preRegistrationFieldsSchema.safeParse(fields);
  if (!parsed.success) throw new Error('Revise os campos obrigatórios.');
  const { name, legalName, city, state, contact, email } = parsed.data;
  const result = await anonPublicRpc('cali_submit_company_pre_registration', {
    p_token: z.uuid().parse(token),
    p_name: name,
    p_legal_name: legalName,
    p_city: city,
    p_state: state,
    p_contact: contact,
    p_email: email,
  });
  if (result.error) throw new Error(result.error.message);
  z.literal('submitted').parse(result.data);
}
