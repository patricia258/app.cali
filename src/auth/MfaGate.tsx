import { Button } from '../components/ds/Button';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ShieldCheck } from 'lucide-react';
import { checkMfaOnce, confirmWorkspaceMfa, sessionScope, type MfaGateState } from '../api/access/mfa';
import { endWorkspaceSession, isSupabaseConfigured, observeWorkspaceSession, readWorkspaceSession } from '../api/access/session';
import { useWorkspaceAuth } from './hooks/useWorkspaceAuth';

export function MfaGate({ children }: { children: ReactNode }) {
  const { user } = useWorkspaceAuth();
  const actorId = user?.id ?? '';
  return <ActorMfaGate key={actorId} actorId={actorId}>{children}</ActorMfaGate>;
}

function ActorMfaGate({ actorId, children }: { actorId: string; children: ReactNode }) {
  const [scope, setScope] = useState<string | null>();
  const currentScope = useRef<string | null>();
  const [snapshot, setSnapshot] = useState<{ scope: string; revision: number; gate: MfaGateState }>();
  const [revision, setRevision] = useState(0);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const confirming = useRef(false);
  const gate: MfaGateState = scope === null
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
    if (!isSupabaseConfigured) {
      trackSession(null);
      return;
    }
    let active = true;
    const unsubscribe = observeWorkspaceSession((session) => {
      if (active) trackSession(session);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [trackSession]);

  useEffect(() => {
    if (!isSupabaseConfigured || !scope) return;
    let active = true;
    const publish = (next: MfaGateState) => {
      if (active && currentScope.current === scope) setSnapshot({ scope, revision, gate: next });
    };
    setCode('');
    setMessage('');
    void checkMfaOnce(actorId, scope).then(
      publish,
      () => {
        publish({ stage: 'error', message: 'Não foi possível conferir ou cadastrar o autenticador. Tente novamente.' });
      },
    );
    return () => { active = false; };
  }, [actorId, scope, revision]);

  function retry() {
    setCode('');
    setMessage('');
    setRevision((value) => value + 1);
    if (scope === null && isSupabaseConfigured) {
      void readWorkspaceSession().then((session) => {
        if (session && currentScope.current === null) trackSession(session);
      }).catch(() => undefined);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured || !scope || (gate.stage !== 'verify' && gate.stage !== 'enroll') || confirming.current || !/^\d{6}$/.test(code)) return;
    confirming.current = true;
    setBusy(true); setMessage('');
    try {
      const verifiedScope = await confirmWorkspaceMfa(actorId, scope, gate.factorId, code);
      if (!verifiedScope) {
        if (currentScope.current === scope) {
          setMessage('Código incorreto ou expirado. Confira o aplicativo e tente de novo.');
          setCode('');
        }
        return;
      }
      // A mudança de nível já dispara a checagem dos fatores. Repetir só para a mesma sessão AAL2.
      if (verifiedScope === scope) setRevision((value) => value + 1);
    } catch {
      if (currentScope.current === scope) {
        setSnapshot({ scope, revision, gate: { stage: 'error', message: 'Não foi possível confirmar a segurança do acesso. Tente novamente.' } });
      }
    } finally {
      confirming.current = false;
      setBusy(false);
    }
  }
  async function leave() { await endWorkspaceSession(); window.location.assign('/login'); }

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
