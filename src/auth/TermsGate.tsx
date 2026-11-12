import { Button } from '../components/ds/Button';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FileCheck2 } from 'lucide-react';
import { confirmTermsAcceptance, readTermsState, type TermsState } from '../api/access/terms';
import type { WorkspaceRole } from '../api/access/profile';
import { supabase } from '../api/supabase';
import { LegalDocument } from '../components/legal/LegalDocument';
import { privacyPolicy, termsOfUse } from '../domain/legalTexts';
import { useWorkspaceAuth } from './hooks/useWorkspaceAuth';
import '../components/legal/legal.css';

type GateState =
  | { kind: 'checking' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'terms'; publication: TermsState };

function TermsLoading() {
  return <main className="v2-mfa"><p className="v2-mfa-wait" aria-busy="true">Carregando…</p></main>;
}

async function leave() {
  if (supabase) await supabase.auth.signOut();
  window.location.assign('/login');
}

function ActorTermsGate({ id, role, children }: {
  id: string | undefined;
  role: WorkspaceRole | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<GateState>({ kind: 'checking' });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    if (!id || !role) {
      setState({ kind: 'unavailable', message: 'Sessão indisponível. Entre novamente para continuar.' });
      return;
    }
    const request = new AbortController();
    pending.current?.abort();
    pending.current = request;
    setAgreed(false);
    setState({ kind: 'checking' });
    try {
      const publication = await readTermsState({ id, role }, request.signal);
      if (!request.signal.aborted) setState({ kind: 'terms', publication });
    } catch {
      if (!request.signal.aborted) {
        setState({ kind: 'unavailable', message: 'Não foi possível verificar os termos de uso. Tente novamente.' });
      }
    } finally {
      if (pending.current === request) pending.current = null;
    }
  }, [id, role]);

  useEffect(() => {
    void check();
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [check]);

  async function accept() {
    if (!id || !role || !agreed || pending.current || state.kind !== 'terms' || state.publication.accepted) return;

    const request = new AbortController();
    pending.current = request;
    setBusy(true);
    try {
      const publication = await confirmTermsAcceptance({ id, role }, state.publication, request.signal);
      if (!request.signal.aborted) setState({ kind: 'terms', publication });
    } catch {
      if (!request.signal.aborted) {
        setState({ kind: 'unavailable', message: 'Não foi possível confirmar o aceite. Tente novamente.' });
      }
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  if (state.kind === 'terms' && state.publication.accepted) return <>{children}</>;
  if (state.kind === 'checking') return <TermsLoading />;
  return <main className="v2-mfa">
    <section className="v2-mfa-card v2-terms-card" aria-labelledby="v2-terms-title">
      <span className="v2-mfa-icon" aria-hidden="true"><FileCheck2 size={22} /></span>
      <h1 id="v2-terms-title">Termos de uso e privacidade</h1>
      {state.kind === 'unavailable' ? <>
        <p className="v2-mfa-error" role="alert">{state.message}</p>
        {id && role && <Button type="button" variant="gatePrimary" onClick={() => void check()}>Tentar novamente</Button>}
      </> : <>
        <p>Antes de continuar, leia como o CALI Workspace funciona e como tratamos os seus dados.</p>
        <div className="v2-terms-text" tabIndex={0}><LegalDocument source={termsOfUse()} idPrefix="gate-terms" /><LegalDocument source={privacyPolicy()} idPrefix="gate-privacy" /></div>
        <p className="v2-terms-links">Também disponíveis em <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</p>
        <label className="v2-terms-check"><input type="checkbox" disabled={busy} checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>Li e aceito os termos de uso e a política de privacidade.</span></label>
        <Button type="button" variant="gatePrimary" disabled={busy || !agreed} onClick={() => void accept()}>{busy ? 'Registrando…' : 'Continuar'}</Button>
      </>}
      <Button type="button" variant="gateExit" onClick={() => void leave()}>Sair</Button>
    </section>
  </main>;
}

export function TermsGate({ children }: { children: ReactNode }) {
  const { ready, user, role, active } = useWorkspaceAuth();
  if (!ready) return <TermsLoading />;

  const id = active ? user?.id : undefined;
  return <ActorTermsGate key={`${role ?? ''}:${id ?? ''}`} id={id} role={role}>{children}</ActorTermsGate>;
}
