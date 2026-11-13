import { Button } from '../components/ds/Button';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { FileCheck2 } from 'lucide-react';
import { confirmTermsAcceptance, readTermsState, type TermsState } from '../api/access/terms';
import type { WorkspaceRole } from '../api/access/profile';
import { endWorkspaceSession, observeWorkspaceSession } from '../api/access/session';
import { LegalDocument } from '../components/legal/LegalDocument';
import { privacyPolicy, termsOfUse } from '../domain/legalTexts';
import { activateWorkspaceMedia } from '../lib/workspaceMedia';
import { startCompanyLogoBackfill } from '../lib/companyLogoBackfill';
import { useWorkspaceAuth } from './hooks/useWorkspaceAuth';
import { AccessGateCard } from './components/AccessGateCard';
import { AccessGateError } from './components/AccessGateError';
import { AccessGateLoading } from './components/AccessGateLoading';

type GateState =
  | { kind: 'checking' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'terms'; publication: TermsState };

async function leave() {
  await endWorkspaceSession();
  window.location.assign('/login');
}

function AdmittedWorkspace({ actorId, children }: { actorId: string; children: ReactNode }) {
  useLayoutEffect(() => {
    const scope = new AbortController();
    activateWorkspaceMedia(scope.signal);
    const unsubscribe = observeWorkspaceSession((session) => {
      if (session?.user.id !== actorId) scope.abort();
    });
    const timer = window.setTimeout(() => startCompanyLogoBackfill(scope.signal), 900);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      scope.abort();
    };
  }, [actorId]);
  return <>{children}</>;
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

  if (id && state.kind === 'terms' && state.publication.accepted) return <AdmittedWorkspace actorId={id}>{children}</AdmittedWorkspace>;
  if (state.kind === 'checking') return <AccessGateLoading>Carregando…</AccessGateLoading>;
  return <AccessGateCard icon={FileCheck2} title="Termos de uso e privacidade" wide>
      {state.kind === 'unavailable' ? <>
        <AccessGateError>{state.message}</AccessGateError>
        {id && role && <Button type="button" variant="gatePrimary" onClick={() => void check()}>Tentar novamente</Button>}
      </> : <>
        <p className="tw:m-0 tw:text-base tw:leading-[1.55] tw:text-[#5f5650]">Antes de continuar, leia como o CALI Workspace funciona e como tratamos os seus dados.</p>
        <div className="tw:max-h-[46vh] tw:overflow-y-auto tw:rounded-[.75rem] tw:border tw:border-solid tw:border-[#eee3dc] tw:bg-[#fcfaf8] tw:px-5 tw:py-[1.077rem] tw:text-base tw:leading-[1.55] tw:text-[#4e4140] tw:[scrollbar-width:none] tw:[&_h2]:mt-3.5 tw:[&_h2]:mb-1 tw:[&_h2]:text-base tw:[&_h2]:text-[#2b2024] tw:[&_h2:first-child]:mt-0 tw:[&_p]:mt-0 tw:[&_p]:mb-2.5" tabIndex={0}><LegalDocument source={termsOfUse()} idPrefix="gate-terms" embedded /><LegalDocument source={privacyPolicy()} idPrefix="gate-privacy" embedded /></div>
        <p className="tw:m-0 tw:text-[.923rem] tw:text-[#6b5d63] tw:[&_a]:font-semibold tw:[&_a]:text-cali-brand">Também disponíveis em <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</p>
        <label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-[.7rem] tw:text-base tw:text-[#2b2024]"><input className="tw:mt-0.5 tw:accent-[#7a1f3d]" type="checkbox" disabled={busy} checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>Li e aceito os termos de uso e a política de privacidade.</span></label>
        <Button type="button" variant="gatePrimary" disabled={busy || !agreed} onClick={() => void accept()}>{busy ? 'Registrando…' : 'Continuar'}</Button>
      </>}
      <Button type="button" variant="gateExit" onClick={() => void leave()}>Sair</Button>
  </AccessGateCard>;
}

export function TermsGate({ children }: { children: ReactNode }) {
  const { ready, user, role, active } = useWorkspaceAuth();
  if (!ready) return <AccessGateLoading>Carregando…</AccessGateLoading>;

  const id = active ? user?.id : undefined;
  return <ActorTermsGate key={`${role ?? ''}:${id ?? ''}`} id={id} role={role}>{children}</ActorTermsGate>;
}
