import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FolderKanban } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { countAdminProjects } from '../../../api/projects/workspace';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { AdminProjectsPageV3 } from '../../projects/AdminProjectsPageV3';

export function AdminProjectsGatePage() {
  const { user } = useWorkspaceAuth();
  const projects = useQuery({
    queryKey: ['admin-projects-count', user?.id],
    queryFn: ({ signal }) => countAdminProjects(signal),
    gcTime: 0,
  });
  if (projects.data && projects.data > 0) return <AdminProjectsPageV3 />;
  if (projects.isPending) return <Shell role="admin"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando projetos…</section></Shell>;

  return (
    <Shell role="admin">
      <section className="page projects-flow-page">
        <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
        <div className="page-heading"><div><h1>Projetos</h1><p>Projetos e entregáveis reais ficam persistidos no Workspace e alimentam Documentos, horas, histórico e validações.</p></div></div>

        {projects.isSuccess && (
          <section className="panel project-real-data-gate">
            <div className="project-real-data-gate-icon"><FolderKanban size={28} /></div>
            <div>
              <span className="section-kicker">BASE REAL</span>
              <h2>Ainda não há um projeto persistido.</h2>
              <p>Os projetos de demonstração usados como referência visual não podem mais receber alterações em produção. Isso evita que uma entrega pareça salva e desapareça ao trocar de página.</p>
              <InlineNotice><AlertTriangle size={18} />Crie ou use um projeto real para que entregáveis, subtarefas, NPS e prévias em Documentos sejam gravados de verdade.</InlineNotice>
            </div>
          </section>
        )}

        {projects.isError && <section className="panel project-real-data-gate"><AlertTriangle size={24} /><div><h2>Não foi possível validar a base de projetos.</h2><p>{projects.error.message}</p></div></section>}
      </section>
    </Shell>
  );
}

