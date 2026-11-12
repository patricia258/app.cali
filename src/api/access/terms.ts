import { z } from 'zod';
import { LEGAL_VERSION, legalEnabled, privacyPolicy, termsOfUse } from '../../legal/legalTexts';
import { supabase } from '../../lib/supabase';
import type { WorkspaceRole } from './profile';

const publicationSchema = z.object({
  version: z.literal(LEGAL_VERSION),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  accepted: z.boolean(),
});
const legacyReceiptSchema = publicationSchema.pick({ version: true }).nullable();

type TermsActor = { id: string; role: WorkspaceRole };
export type TermsState = z.infer<typeof publicationSchema>;

const unavailable = () => new Error('Não foi possível confirmar os termos de uso.');

async function termsSession(actorId: string, signal: AbortSignal) {
  if (!supabase || !legalEnabled()) throw unavailable();
  const client = supabase;
  signal.throwIfAborted();
  const { data, error } = await client.auth.getSession();
  signal.throwIfAborted();
  const session = data?.session;
  if (error || !session?.access_token || session.user.id !== actorId) throw unavailable();

  // Fixar o token impede o SDK de trocar o ator da operação durante a requisição.
  return { client, authorization: `Bearer ${session.access_token}` };
}

async function readTerms(
  actor: TermsActor,
  { client, authorization }: Awaited<ReturnType<typeof termsSession>>,
  signal: AbortSignal,
): Promise<TermsState> {
  signal.throwIfAborted();
  const { data, error } = await client
    .rpc('v2_read_terms_state')
    .setHeader('Authorization', authorization)
    .abortSignal(signal);
  if (error) throw unavailable();
  const publication = publicationSchema.parse(data);
  const bundledContent = `${termsOfUse()}\n\n${privacyPolicy()}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bundledContent));
  const contentHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  signal.throwIfAborted();
  if (publication.contentHash !== contentHash) throw unavailable();
  if (actor.role !== 'partner') return publication;

  // O contrato hospedado de confirmação V2 ainda não admite Partner.
  const receipt = await client
    .from('terms_acceptances')
    .select('version')
    .eq('user_id', actor.id)
    .eq('version', publication.version)
    .setHeader('Authorization', authorization)
    .abortSignal(signal)
    .maybeSingle();
  if (receipt.error) throw unavailable();
  signal.throwIfAborted();
  return { ...publication, accepted: legacyReceiptSchema.parse(receipt.data) !== null };
}

export async function readTermsState(actor: TermsActor, signal: AbortSignal) {
  return readTerms(actor, await termsSession(actor.id, signal), signal);
}

export async function confirmTermsAcceptance(
  actor: TermsActor,
  presented: Pick<TermsState, 'version' | 'contentHash'>,
  signal: AbortSignal,
): Promise<TermsState> {
  const session = await termsSession(actor.id, signal);
  const current = await readTerms(actor, session, signal);
  if (current.version !== presented.version || current.contentHash !== presented.contentHash)
    throw unavailable();
  if (current.accepted) return current;

  signal.throwIfAborted();
  const { client, authorization } = session;
  if (actor.role === 'partner') {
    const { error } = await client
      .from('terms_acceptances')
      .insert({
        user_id: actor.id,
        version: current.version,
        user_agent: navigator.userAgent.slice(0, 300),
      })
      .setHeader('Authorization', authorization)
      .abortSignal(signal);
    if (error && error.code !== '23505') throw unavailable();
  } else {
    const { error } = await client
      .rpc('v2_accept_terms', { p_version: current.version, p_content_hash: current.contentHash })
      .setHeader('Authorization', authorization)
      .abortSignal(signal);
    if (error) throw unavailable();
  }

  const confirmed = await readTerms(actor, session, signal);
  if (!confirmed.accepted || confirmed.version !== current.version || confirmed.contentHash !== current.contentHash)
    throw unavailable();
  return confirmed;
}
