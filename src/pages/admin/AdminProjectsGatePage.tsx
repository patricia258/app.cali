import { useEffect, useState } from 'react';
import { AlertTriangle, FolderKanban, Loader2 } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { fetchProjectsWorkspaceSnapshot, readProjectsWorkspaceSnapshot } from '../../lib/projectsWorkspaceSnapshot';
import { AdminProjectsPageV3 } from './AdminProjectsPageV3';

type GateState = 'loading' | 'ready' | 'empty' | 'error';

type GateCache = { ready: boolean; savedAt: number };
const GATE_CACHE_KEY = 'cali-admin-projects-gate-v1';
const GATE_CACHE_TTL = 15 * 60 * 1000;

function readGateCache(): GateCache | null {
  try {
    const raw = window.localStorage.getItem(GATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GateCache;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > GATE_CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeGateCache(ready: boolean) {
  try {
    window.localStorage.setItem(GATE_CACHE_KEY, JSON.stringify({ ready, savedAt: Date.now() } satisfies GateCache));
  } catch {
    // Cache é apenas uma aceleração. Nunca bloqueia o Workspace.
  }
}

export function AdminProjectsGatePage() {
  const cachedGate = readGateCache();
  const cachedSnapshot = readProjectsWorkspaceSnapshot();
  const cachedReady = Boolean(cachedGate?.ready && cachedSnapshot?.projects.length);
  const [state, setState] = useState<GateState>(cachedReady ? 'ready' : 'loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (cachedReady) return;
    void checkWorkspace();
  }, []);

  async function checkWorkspace() {
    const { data, error } = await fetchProjectsWorkspaceSnapshot();
    if (error) {
      setState('error');
      setMessage(error.message);
      return;
    }
    const ready = Boolean(data?.projects.length);
    writeGateCache(ready);
    setState(ready ? 'ready' : 'empty');
  }

  if (state === 'ready') return <AdminProjectsPageV3 />;

  return (
    <Shell role="admin">
      <section className="page projects-flow-page">
        <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
        <div className="page-heading"><div><h1>Projetos</h1><p>Projetos e entregáveis reais ficam persistidos no Workspace e alimentam Documentos, horas, histórico e validações.</p></div></div>

        {state === 'loading' && <section className="panel data-loading"><Loader2 className="spin" size={20} />Confirmando projetos reais do Workspace…</section>}

        {state === 'empty' && (
          <section className="panel project-real-data-gate">
            <div className="project-real-data-gate-icon"><FolderKanban size={28} /></div>
            <div>
              <span className="section-kicker">BASE REAL</span>
              <h2>Ainda não há um projeto persistido.</h2>
              <p>Os projetos de demonstração usados como referência visual não podem mais receber alterações em produção. Isso evita que uma entrega pareça salva e desapareça ao trocar de página.</p>
              <div className="inline-notice"><AlertTriangle size={18} />Crie ou use um projeto real para que entregáveis, subtarefas, NPS e prévias em Documentos sejam gravados de verdade.</div>
            </div>
          </section>
        )}

        {state === 'error' && <section className="panel project-real-data-gate"><AlertTriangle size={24} /><div><h2>Não foi possível validar a base de projetos.</h2><p>{message}</p></div></section>}
      </section>
    </Shell>
  );
}
