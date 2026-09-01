import { useEffect, useState } from 'react';
import { AlertTriangle, FolderKanban, Loader2 } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import { AdminProjectsPageV3 } from './AdminProjectsPageV3';

type GateState = 'loading' | 'ready' | 'empty' | 'error';

export function AdminProjectsGatePage() {
  const [state, setState] = useState<GateState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => { void checkWorkspace(); }, []);

  async function checkWorkspace() {
    if (!supabase) {
      setState('error');
      setMessage('Supabase não configurado.');
      return;
    }
    const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
    if (error) {
      setState('error');
      setMessage(error.message);
      return;
    }
    setState((count || 0) > 0 ? 'ready' : 'empty');
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
