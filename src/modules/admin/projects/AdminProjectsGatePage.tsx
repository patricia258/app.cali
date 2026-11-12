import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
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
  if (projects.isSuccess) return <AdminProjectsPageV3 emptyPortfolio={projects.data === 0} />;
  if (projects.isPending) return <Shell role="admin"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando projetos…</section></Shell>;

  return (
    <Shell role="admin">
      <section className="page projects-flow-page">
        <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
        <div className="page-heading"><div><h1>Projetos</h1><p>Projetos e entregáveis reais ficam persistidos no Workspace e alimentam Documentos, horas, histórico e validações.</p></div></div>

        {projects.isError && <section className="panel project-real-data-gate"><AlertTriangle size={24} /><div><h2>Não foi possível validar a base de projetos.</h2><p>{projects.error.message}</p></div></section>}
      </section>
    </Shell>
  );
}
