import { Button } from '../components/ds/Button';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../api/supabase';
import { useWorkspaceAuth } from './hooks/useWorkspaceAuth';

type AuthClient = NonNullable<typeof supabase>['auth'];
type GateState =
  | { stage: 'checking' }
  | { stage: 'ok' }
  | { stage: 'verify'; factorId: string }
  | { stage: 'enroll'; factorId: string; qr: string; secret: string }
  | { stage: 'error'; message: string };

const claimsSchema = z.object({ sub: z.string(), session_id: z.uuid(), aal: z.enum(['aal1', 'aal2']) });
const pendingChecks = new Map<string, { scope: string; result: Promise<GateState> }>();

function sessionScope(session: Session | null, actorId: string) {
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

async function checkMfa(auth: AuthClient, actorId: string, scopeKey: string): Promise<GateState> {
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

async function checkMfaOnce(auth: AuthClient, actorId: string, scope: string): Promise<GateState> {
  const pending = pendingChecks.get(actorId);
  if (pending?.scope === scope) return pending.result;
  if (pending) {
    await pending.result.catch(() => undefined);
    return checkMfaOnce(auth, actorId, scope);
  }

  // O replay de efeitos do StrictMode reaproveita a mesma operação de cadastro.
  const result = checkMfa(auth, actorId, scope).finally(() => pendingChecks.delete(actorId));
  pendingChecks.set(actorId, { scope, result });
  return result;
}

export function MfaGate({ children }: { children: ReactNode }) {
  const { user } = useWorkspaceAuth();
  const actorId = user?.id ?? '';
  return <ActorMfaGate key={actorId} actorId={actorId}>{children}</ActorMfaGate>;
}

function ActorMfaGate({ actorId, children }: { actorId: string; children: ReactNode }) {
  const auth = supabase?.auth;
  const [scope, setScope] = useState<string | null>();
  const currentScope = useRef<string | null>();
  const [snapshot, setSnapshot] = useState<{ scope: string; revision: number; gate: GateState }>();
  const [revision, setRevision] = useState(0);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const confirming = useRef(false);
  const gate: GateState = scope === null
    ? { stage: 'error', message: 'Não foi possível verificar a sessão. Tente novamente.' }
    : snapshot && snapshot.scope === scope && snapshot.revision === revision ? snapshot.gate : { stage: 'checking' };
  const { stage } = gate;

  const trackSession = useCallback((session: Session | null) => {
    const next = sessionScope(session, actorId)?.key ?? null;
    if (currentScope.current === next) return;
    currentScope.current = next;
    setRevision((value) => value + 1);
    setScope(next);
  }, [actorId]);

  useEffect(() => {
    if (!auth) {
      trackSession(null);
      return;
    }
    let active = true;
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (active) trackSession(session);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [auth, trackSession]);

  useEffect(() => {
    if (!auth || !scope) return;
    let active = true;
    const publish = (next: GateState) => {
      if (active && currentScope.current === scope) setSnapshot({ scope, revision, gate: next });
    };
    setCode('');
    setMessage('');
    void checkMfaOnce(auth, actorId, scope).then(
      publish,
      () => {
        publish({ stage: 'error', message: 'Não foi possível conferir ou cadastrar o autenticador. Tente novamente.' });
      },
    );
    return () => { active = false; };
  }, [auth, actorId, scope, revision]);

  function retry() {
    setCode('');
    setMessage('');
    setRevision((value) => value + 1);
    if (scope === null && auth) {
      void auth.getSession().then(({ data: { session }, error }) => {
        if (!error && currentScope.current === null) trackSession(session);
      }).catch(() => undefined);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!auth || !scope || (gate.stage !== 'verify' && gate.stage !== 'enroll') || confirming.current || !/^\d{6}$/.test(code)) return;
    confirming.current = true;
    setBusy(true); setMessage('');
    try {
      await requireSession(auth, actorId, scope);
      const result = await auth.mfa.challengeAndVerify({ factorId: gate.factorId, code });
      if (result.error) {
        if (currentScope.current === scope) {
          setMessage('Código incorreto ou expirado. Confira o aplicativo e tente de novo.');
          setCode('');
        }
        return;
      }
      const { scope: verifiedScope, token } = await requireSession(auth, actorId);
      if (result.data?.user.id !== actorId || result.data.access_token !== token || verifiedScope.level !== 'aal2') {
        throw new Error('A segunda etapa ainda não foi confirmada.');
      }
      // A mudança de nível já dispara a checagem dos fatores. Repetir só para a mesma sessão AAL2.
      if (verifiedScope.key === scope) setRevision((value) => value + 1);
    } catch {
      if (currentScope.current === scope) {
        setSnapshot({ scope, revision, gate: { stage: 'error', message: 'Não foi possível confirmar a segurança do acesso. Tente novamente.' } });
      }
    } finally {
      confirming.current = false;
      setBusy(false);
    }
  }
  async function leave() { if (supabase) await supabase.auth.signOut(); window.location.assign('/login'); }

  if (stage === 'ok') return <>{children}</>;
  if (stage === 'checking') return <main className="v2-mfa"><p className="v2-mfa-wait" aria-busy="true">Conferindo a segurança do acesso…</p></main>;
  return <main className="v2-mfa">
    <section className="v2-mfa-card" aria-labelledby="v2-mfa-title">
      <span className="v2-mfa-icon" aria-hidden="true"><ShieldCheck size={22} /></span>
      <h1 id="v2-mfa-title">{stage === 'enroll' ? 'Ative a verificação em duas etapas' : 'Verificação em duas etapas'}</h1>
      {stage === 'error' && <>
        <p className="v2-mfa-error" role="alert">{gate.message}</p>
        <Button type="button" variant="gatePrimary" onClick={retry}>Tentar novamente</Button>
      </>}
      {stage === 'enroll' && <>
        <p>Proteção extra para o seu acesso. Você faz isso uma vez só.</p>
        <ol className="v2-mfa-steps">
          <li>Instale no celular o <strong>Google Authenticator</strong> ou o <strong>Microsoft Authenticator</strong>.</li>
          <li>No aplicativo, toque em adicionar e leia este QR code.</li>
          <li>Digite abaixo o código de 6 dígitos que aparecer.</li>
        </ol>
        <img className="v2-mfa-qr" src={gate.qr} alt="QR code para cadastrar o CALI Workspace no aplicativo autenticador" />
        <p className="v2-mfa-secret">Sem câmera? Digite esta chave no aplicativo: <code>{gate.secret}</code></p>
      </>}
      {stage === 'verify' && <p>Abra o aplicativo autenticador do seu celular e digite o código de 6 dígitos do CALI Workspace.</p>}
      {stage !== 'error' && <form onSubmit={(event) => void confirm(event)} className="v2-mfa-form">
        <label>Código do aplicativo<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /></label>
        {message && <p className="v2-mfa-error" role="alert">{message}</p>}
        <Button type="submit" variant="gatePrimary" disabled={busy || code.length !== 6}>{busy ? 'Conferindo…' : 'Confirmar'}</Button>
      </form>}
      <Button type="button" variant="gateExit" onClick={() => void leave()}>Sair</Button>
    </section>
  </main>;
}
