import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from '../supabase';

type AuthClient = NonNullable<typeof supabase>['auth'];
export type MfaGateState =
  | { stage: 'checking' }
  | { stage: 'ok' }
  | { stage: 'verify'; factorId: string }
  | { stage: 'enroll'; factorId: string; qr: string; secret: string }
  | { stage: 'error'; message: string };

const claimsSchema = z.object({ sub: z.string(), session_id: z.uuid(), aal: z.enum(['aal1', 'aal2']) });
const pendingChecks = new Map<string, { scope: string; result: Promise<MfaGateState> }>();

export function sessionScope(session: Session | null, actorId: string) {
  if (!session || session.user.id !== actorId) return null;
  try {
    const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.charCodeAt(0)));
    const claims = claimsSchema.parse(JSON.parse(decoded));
    if (claims.sub !== actorId) return null;
    return { key: `${claims.session_id}:${claims.aal}`, level: claims.aal };
  } catch {
    return null;
  }
}

async function requireSession(auth: AuthClient, actorId: string, expectedScope?: string) {
  const { data: { session }, error } = await auth.getSession();
  const scope = sessionScope(session, actorId);
  if (error || !session || !scope || (expectedScope && scope.key !== expectedScope)) {
    throw new Error('A sessão mudou. Tente novamente.');
  }
  return { token: session.access_token, scope };
}

async function checkMfa(auth: AuthClient, actorId: string, scopeKey: string): Promise<MfaGateState> {
  const { scope, token } = await requireSession(auth, actorId, scopeKey);
  // Validar o mesmo JWT no Auth e aproveitar a resposta para conferir os fatores vigentes.
  const { data, error } = await auth.getUser(token);
  if (error || data.user?.id !== actorId) {
    throw new Error('Não foi possível consultar o autenticador. Tente novamente.');
  }
  await requireSession(auth, actorId, scopeKey);
  const factors = data.user.factors ?? [];
  const verified = factors.find((factor) => factor.factor_type === 'totp' && factor.status === 'verified');
  if (verified) return scope.level === 'aal2' ? { stage: 'ok' } : { stage: 'verify', factorId: verified.id };

  // Remover cadastros TOTP incompletos antes de tentar emitir outro QR code.
  for (const factor of factors) {
    if (factor.factor_type !== 'totp' || factor.status === 'verified') continue;
    await requireSession(auth, actorId, scopeKey);
    const result = await auth.mfa.unenroll({ factorId: factor.id });
    if (result.error) throw new Error('Não foi possível preparar o cadastro do autenticador. Tente novamente.');
  }
  await requireSession(auth, actorId, scopeKey);
  const enrolled = await auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CALI Workspace' });
  if (enrolled.error || !enrolled.data?.id || !enrolled.data.totp?.qr_code || !enrolled.data.totp.secret) {
    throw new Error('Não foi possível cadastrar o autenticador. Tente novamente.');
  }
  await requireSession(auth, actorId, scopeKey);
  return { stage: 'enroll', factorId: enrolled.data.id, qr: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret };
}

export async function checkMfaOnce(actorId: string, scope: string): Promise<MfaGateState> {
  const auth = supabase?.auth;
  if (!auth) throw new Error('Conexão indisponível.');
  const pending = pendingChecks.get(actorId);
  if (pending?.scope === scope) return pending.result;
  if (pending) {
    await pending.result.catch(() => undefined);
    return checkMfaOnce(actorId, scope);
  }

  // O replay de efeitos do StrictMode reaproveita a mesma operação de cadastro.
  const result = checkMfa(auth, actorId, scope).finally(() => pendingChecks.delete(actorId));
  pendingChecks.set(actorId, { scope, result });
  return result;
}

export async function confirmWorkspaceMfa(actorId: string, scope: string, factorId: string, code: string) {
  const auth = supabase?.auth;
  if (!auth) throw new Error('Conexão indisponível.');
  await requireSession(auth, actorId, scope);
  const result = await auth.mfa.challengeAndVerify({ factorId, code });
  if (result.error) return null;
  const { scope: verifiedScope, token } = await requireSession(auth, actorId);
  if (result.data?.user.id !== actorId || result.data.access_token !== token || verifiedScope.level !== 'aal2') {
    throw new Error('A segunda etapa ainda não foi confirmada.');
  }
  return verifiedScope.key;
}
