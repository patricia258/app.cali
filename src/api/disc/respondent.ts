import { z } from 'zod';
import { anonPublicRpc } from '../supabase';

const linkSchema = z.object({
  title: z.string(),
  purpose: z.string().nullish().transform((value) => value ?? ''),
  status: z.enum(['open', 'closed']),
  company_name: z.string().nullish().transform((value) => value ?? null),
  has_company: z.boolean().nullish().transform((value) => value ?? false),
});

const inviteSchema = z.object({
  state: z.enum(['created', 'sent', 'opened', 'started', 'completed', 'expired', 'declined']),
  person_name: z.string(),
  email: z.string(),
  slug: z.string(),
  deadline_at: z.string().nullable(),
  last_block: z.number().nullable(),
});

export type RespondentLink = z.infer<typeof linkSchema>;
export type RespondentInvite = z.infer<typeof inviteSchema>;

export async function openRespondentQuestionnaire(slug: string, inviteToken: string) {
  const [link, invite] = await Promise.all([
    anonPublicRpc('cali_profile_link', { p_slug: slug }),
    inviteToken ? anonPublicRpc('cali_profile_invite_open', { p_token: inviteToken }) : { data: null },
  ]);
  const publicLink = linkSchema.safeParse(link.data);
  const invitation = inviteSchema.safeParse(invite.data);
  if (!publicLink.success) return null;
  if (inviteToken && (!invitation.success || invitation.data.slug !== slug)) return null;
  return { link: publicLink.data, invite: invitation.success ? invitation.data : null };
}

export async function recordRespondentProgress(inviteToken: string, block: number) {
  await anonPublicRpc('cali_profile_invite_progress', { p_token: inviteToken, p_block: block });
}

const receiptSchema = z.object({ token: z.string().min(1) });
type Answer = { b: number; mais: string; menos: string };
type Questionnaire = {
  slug: string;
  inviteToken: string;
  person: { name: string; email: string; job: string; company: string };
  answers: { natural: Answer[]; pressure: Answer[] };
  consent: boolean;
};

export async function submitRespondentQuestionnaire({ slug, inviteToken, person, answers, consent }: Questionnaire) {
  const shared = { p_job_title: person.job.trim(), p_answers: answers, p_consent: consent };
  const result = inviteToken
    ? await anonPublicRpc('cali_profile_submit_invite', { ...shared, p_token: inviteToken })
    : await anonPublicRpc('cali_profile_submit', {
      ...shared, p_slug: slug, p_name: person.name.trim(), p_email: person.email.trim(), p_company_name: person.company.trim(),
    });

  if (result.error) return { token: null, error: result.error.message };
  const receipt = receiptSchema.safeParse(result.data);
  return { token: receipt.success ? receipt.data.token : null, error: null };
}

export async function declineRespondentInvitation(token: string) {
  const result = await anonPublicRpc('cali_profile_invite_decline', { p_token: token });
  return z.object({ ok: z.literal(true) }).safeParse(result.data).success;
}
