import { StrictMode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceAuthContext } from '../../src/auth/workspaceAuthContext';
import { AppErrorBoundary } from '../../src/components/feedback/AppErrorBoundary';
import { TimerFinalizationDialog } from '../../src/components/hours/TimerFinalizationDialog';
import { WELCOME_OPEN_EVENT, WelcomeTour } from '../../src/components/workspace/WelcomeTour';
import { Button } from '../../src/components/ds/Button';
import { DataTable } from '../../src/components/ds/DataTable';
import { DialogForm } from '../../src/components/ds/DialogForm';
import { DialogFrame } from '../../src/components/ds/DialogFrame';
import { EmptyState } from '../../src/components/ds/EmptyState';
import { FieldLabel } from '../../src/components/ds/FieldLabel';
import { FilterSelect } from '../../src/components/ds/FilterSelect';
import { GuidedInput, GuidedTextarea } from '../../src/components/ds/GuidedField';
import { InlineNotice } from '../../src/components/ds/InlineNotice';
import { LoadingState } from '../../src/components/ds/LoadingState';
import { StatusBadge } from '../../src/components/ds/StatusBadge';
import { WorkspaceRouteLoader } from '../../src/components/ds/WorkspaceRouteLoader';
import { useDialogFocus } from '../../src/components/ds/useDialogFocus';
import { DeliverableDependencies } from '../../src/components/projects/DeliverableDependencies';
import { ReportManualComplementsPanel } from '../../src/modules/admin/reports/components/ReportManualComplementsPanel';
import type { ReportManualComplements } from '../../src/lib/reportManualComplements';
import { activateWorkspaceMedia, resolveWorkspaceMedia } from '../../src/lib/workspaceMedia';
import { ExpensesFixture, NavigationFixture, RequestFixture } from './calendar-navigation-fixtures';
import '../../src/styles/tailwind.css';

function ControlsFixture() {
  const [busy, setBusy] = useState(false);
  const [submissions, setSubmissions] = useState(0);
  const [data, setData] = useState('');
  const [refResult, setRefResult] = useState('');
  const button = useRef<HTMLButtonElement>(null);
  const label = useRef<HTMLLabelElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const select = useRef<HTMLSelectElement>(null);

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setSubmissions((count) => count + 1);
          setData([formData.get('email'), formData.get('status'), formData.get('observations')].join(' · '));
          setBusy(true);
        }}
      >
        <FieldLabel ref={label} id="contact-label" className="fixture-label" htmlFor="email">
          E-mail
        </FieldLabel>
        <GuidedInput
          ref={input}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="fixture-input"
        />
        <FieldLabel>
          Observações
          <GuidedTextarea ref={textarea} id="observations" name="observations" rows={3} maxLength={32} />
        </FieldLabel>
        <FilterSelect
          ref={select}
          id="status"
          name="status"
          aria-label="Situação"
          defaultValue="all"
          className="fixture-select"
        >
          <option value="all">Todas</option>
          <option value="open">Abertas</option>
        </FilterSelect>
        <Button
          ref={button}
          id="submit"
          type="submit"
          name="action"
          value="send"
          variant="workflowPrimary"
          className="fixture-submit"
          pending={busy}
        >
          {busy ? 'Enviando…' : 'Enviar'}
        </Button>
        <Button type="button" variant="secondary" disabled>
          Indisponível
        </Button>
      </form>
      <button type="button" onClick={() => setBusy(false)}>
        Concluir envio
      </button>
      <button
        type="button"
        onClick={() => {
          const refs = [button, label, input, textarea, select];
          const ids = ['submit', 'contact-label', 'email', 'observations', 'status'];
          setRefResult(
            refs.every((ref, index) => ref.current === document.getElementById(ids[index]))
              ? 'Refs nativas'
              : 'Ref inválida',
          );
          textarea.current?.focus();
        }}
      >
        Conferir refs
      </button>
      <output aria-label="Envios">{submissions}</output>
      <output aria-label="Dados enviados">{data}</output>
      <output aria-label="Referências">{refResult}</output>
      <Button variant="close" type="button" />
      <Button variant="inlineClose" type="button" aria-label="Fechar prévia" />
      <Button variant="workflowOutline" type="button" aria-busy="true">
        Preparar
      </Button>
    </>
  );
}

function TablesFixture() {
  return (
    <>
      <DataTable variant="teamReport" className="fixture-table">
        <caption>Equipe</caption>
        <thead>
          <tr>
            <th scope="col">Pessoa</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Pessoa QA</th>
            <td>
              <StatusBadge variant="status">Ativa</StatusBadge>
            </td>
          </tr>
        </tbody>
      </DataTable>
      <DataTable variant="analytics" aria-label="Entregas">
        <thead>
          <tr>
            <th scope="col">Entrega</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Planejamento</td>
            <td>
              <StatusBadge as="b" variant="delivery" className="fixture-status">
                Em revisão
              </StatusBadge>
            </td>
          </tr>
        </tbody>
      </DataTable>
    </>
  );
}

function StatesFixture() {
  const [loading, setLoading] = useState(true);
  return (
    <>
      {loading ? (
        <LoadingState className="fixture-loading">Carregando registros</LoadingState>
      ) : (
        <>
          <EmptyState variant="workflow" as="p" className="fixture-empty">
            Nenhum resultado
          </EmptyState>
          <EmptyState variant="admin" as="section" aria-label="Fila da administração">
            Fila vazia
          </EmptyState>
        </>
      )}
      <button type="button" onClick={() => setLoading(false)}>
        Concluir leitura
      </button>
      <LoadingState role="log" aria-busy={false}>
        Leitura concluída
      </LoadingState>
      <InlineNotice>Informação</InlineNotice>
      <InlineNotice tone="success" className="fixture-notice">
        Salvo
      </InlineNotice>
      <InlineNotice as="p" tone="danger">
        Falhou
      </InlineNotice>
      <InlineNotice as="p" tone="danger" role="status">
        Falha já tratada
      </InlineNotice>
    </>
  );
}

function RouteLoaderFixture() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const resolve = () => setLoading(false);
    window.addEventListener('qa:resolve-route', resolve);
    return () => window.removeEventListener('qa:resolve-route', resolve);
  }, []);

  if (loading) return <WorkspaceRouteLoader />;
  return (
    <main>
      <h1>Registros</h1>
    </main>
  );
}

function FrameFixture({ autoFocus = false }: { autoFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir confirmação</button>
      {open && (
        <DialogFrame aria-label="Confirmação">
          {autoFocus && <input aria-label="Motivo" autoFocus />}
          <Button
            type="button"
            variant="inlineClose"
            aria-label="Fechar confirmação"
            onClick={() => setOpen(false)}
          />
        </DialogFrame>
      )}
    </>
  );
}

function KeyboardFixture() {
  const [open, setOpen] = useState(false);
  const [escapeCount, setEscapeCount] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir revisão
      </button>
      {open && (
        <DialogFrame
          as="aside"
          role="alertdialog"
          aria-labelledby="review-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setEscapeCount((count) => count + 1);
            }
          }}
        >
          <h2 id="review-title">Revisão</h2>
          <button type="button" style={{ visibility: 'hidden' }} aria-label="Fechar">
            Invisível
          </button>
          <Button type="button" variant="close" onClick={() => setOpen(false)} />
          <input aria-label="Observação" />
          <button type="button" disabled>
            Desativado
          </button>
          <button type="button" hidden>
            Oculto
          </button>
          <div ref={(element) => element?.setAttribute('inert', '')}>
            <button type="button">Inerte</button>
          </div>
        </DialogFrame>
      )}
      <output aria-label="Escapes interceptados">{escapeCount}</output>
    </>
  );
}

function NestedFixture() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOuter(true)}>
        Abrir detalhes
      </button>
      {outer && (
        <DialogFrame aria-label="Detalhes">
          <Button type="button" variant="close" style={{ visibility: 'hidden' }} onClick={() => setOuter(false)} />
          <Button type="button" variant="close" onClick={() => setOuter(false)} />
          <button type="button" onClick={() => setInner(true)}>
            Abrir confirmação
          </button>
          {inner && (
            <DialogFrame as="div" aria-label="Confirmação">
              <Button
                type="button"
                variant="inlineClose"
                aria-label="Fechar confirmação"
                onClick={() => setInner(false)}
              />
            </DialogFrame>
          )}
        </DialogFrame>
      )}
    </>
  );
}

function FormFixture() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState('');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir cadastro
      </button>
      {open && (
        <DialogForm
          aria-label="Cadastro"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(String(new FormData(event.currentTarget).get('name')));
            setOpen(false);
          }}
        >
          <label>
            Nome
            <input name="name" required autoFocus />
          </label>
          <Button type="submit" variant="workflowPrimary">
            Salvar
          </Button>
          <Button type="button" variant="close" onClick={() => setOpen(false)} />
        </DialogForm>
      )}
      <output aria-label="Nome salvo">{saved}</output>
    </>
  );
}

function HookFixture() {
  const { ref, handleKeyDown } = useDialogFocus();
  return (
    <>
      <button type="button">Fora</button>
      <section
        ref={(element) => {
          ref.current = element;
        }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Diálogo sem ações"
        onKeyDown={handleKeyDown}
      >
        <p>Processando</p>
      </section>
      <button type="button">Depois</button>
    </>
  );
}

function BrokenView({ message }: { message: string }): never {
  throw new Error(message);
}

function ErrorFixture({ stale = false }: { stale?: boolean }) {
  const [broken, setBroken] = useState(stale && sessionStorage.getItem('qa:stale-module') === 'true');
  return (
    <>
      <AppErrorBoundary>
        {broken ? (
          <BrokenView
            message={stale ? 'ChunkLoadError: fixture desatualizada' : 'Fixture falhou na renderização'}
          />
        ) : (
          <h1>Workspace pronto</h1>
        )}
      </AppErrorBoundary>
      <button
        type="button"
        onClick={() => {
          if (stale) sessionStorage.setItem('qa:stale-module', 'true');
          setBroken(true);
        }}
      >
        Simular falha
      </button>
    </>
  );
}

function TimerFixture() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStep(1);
        }}
      >
        Finalizar execução
      </button>
      <TimerFinalizationDialog
        target={open ? { id: 'qa', label: 'Planejamento QA', kind: 'deliverable' } : null}
        step={step}
        busy={busy}
        onCancel={() => setOpen(false)}
        onAdvance={() => setStep(2)}
        onConfirm={() => {
          setConfirmed((count) => count + 1);
          setBusy(true);
        }}
      />
      <output aria-label="Finalizações">{confirmed}</output>
      <button
        type="button"
        data-complete-timer-fixture=""
        hidden
        onClick={() => {
          setBusy(false);
          setOpen(false);
        }}
      >
        Concluir processamento
      </button>
    </>
  );
}

const tourSteps = [
  { label: 'INÍCIO', title: 'Bem-vinda', text: 'Conheça o espaço.' },
  { href: '/cliente/equipe', label: 'EQUIPE', title: 'Quem está na equipe', text: 'Veja os colaboradores.' },
  { label: 'FIM', title: 'Tudo pronto', text: 'O tour pode ser revisto depois.' },
];

function WelcomeFixture() {
  const [tourHref, setTourHref] = useState<string | null>(null);
  return (
    <WorkspaceAuthContext.Provider
      value={{
        ready: true,
        role: 'client',
        active: true,
        user: {
          id: 'qa-tour',
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-11-12',
        },
        refreshAccess: async () => undefined,
      }}
    >
      <aside className="sidebar">
        <nav>
          <a href="/cliente/equipe" data-tour-highlighted={tourHref === '/cliente/equipe' ? true : undefined}>Equipe</a>
        </nav>
      </aside>
      <button type="button" onClick={() => window.dispatchEvent(new Event(WELCOME_OPEN_EVENT))}>
        Rever apresentação
      </button>
      <WelcomeTour steps={tourSteps} onHighlight={setTourHref} />
    </WorkspaceAuthContext.Provider>
  );
}

function DependenciesFixture({ mode }: { mode: 'admin' | 'staff' }) {
  const [notice, setNotice] = useState('');
  return <WorkspaceAuthContext.Provider value={{
    ready: true, role: mode === 'admin' ? 'admin' : 'partner', active: true,
    user: { id: `qa-${mode}`, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-12' },
    refreshAccess: async () => undefined,
  }}>
    <DeliverableDependencies
      mode={mode}
      companyId="qa-company"
      deliverableId="qa-delivery"
      title="Planejamento QA"
      dueAt="2026-11-12"
      complexity="MC2"
      onNotice={setNotice}
    />
    <output>{notice}</output>
  </WorkspaceAuthContext.Provider>;
}

function ManualComplementsFixture() {
  const [value, setValue] = useState<ReportManualComplements>({ deliveries: [], timeEntries: [] });
  return <ReportManualComplementsPanel value={value} onChange={setValue} />;
}

function WorkspaceMediaFixture() {
  const scope = useRef<AbortController | null>(null);
  const [results, setResults] = useState<Record<string, string[]>>({});

  function read(key: string, replace: boolean) {
    if (replace) {
      scope.current?.abort();
      scope.current = new AbortController();
      activateWorkspaceMedia(scope.current.signal);
    }
    const resolve = () => resolveWorkspaceMedia('private:qa-company/logo.png');
    void Promise.all([resolve(), resolve()]).then((urls) => {
      setResults((current) => ({ ...current, [key]: urls }));
    });
  }

  return <>
    <button onClick={() => read('anterior', true)}>Abrir sessão anterior</button>
    <button onClick={() => read('nova', true)}>Trocar sessão</button>
    <button onClick={() => read('cache', false)}>Consultar novamente</button>
    {Object.entries(results).map(([key, urls]) => <output key={key} aria-label={key}>{JSON.stringify(urls)}</output>)}
  </>;
}

const fixtures = {
  variants: lazy(() => import('./visual-variants').then((module) => ({ default: module.VisualVariants }))),
  controls: ControlsFixture,
  tables: TablesFixture,
  states: StatesFixture,
  loader: RouteLoaderFixture,
  frame: FrameFixture,
  frameAutofocus: () => <FrameFixture autoFocus />,
  keyboard: KeyboardFixture,
  nested: NestedFixture,
  form: FormFixture,
  hook: HookFixture,
  error: ErrorFixture,
  stale: () => <ErrorFixture stale />,
  timer: TimerFixture,
  welcome: WelcomeFixture,
  request: RequestFixture,
  expenses: ExpensesFixture,
  navigation: NavigationFixture,
  dependencyAdmin: () => <DependenciesFixture mode="admin" />,
  dependencyStaff: () => <DependenciesFixture mode="staff" />,
  manualComplements: ManualComplementsFixture,
  workspaceMedia: WorkspaceMediaFixture,
};
const name = (
  location.pathname === '/cliente/cronograma' ? 'request' : new URLSearchParams(location.search).get('fixture')
) as keyof typeof fixtures;
const Fixture = fixtures[name];
if (!Fixture) throw new Error('Fixture desconhecida');
const queryClient = new QueryClient();
createRoot(document.getElementById('fixture')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}><Fixture /></Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
