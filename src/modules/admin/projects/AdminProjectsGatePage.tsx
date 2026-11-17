import { AlertTriangle } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { useAdminProjectCount } from './hooks/useAdminProjectCount';
import { AdminProjectsPage } from '../../projects/AdminProjectsPage';

export function AdminProjectsGatePage() {
  const projects = useAdminProjectCount();
  if (projects.isSuccess) return <AdminProjectsPage emptyPortfolio={projects.data === 0} />;
  if (projects.isPending) return <Shell role="admin"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando projetos…</section></Shell>;

  return (
    <Shell role="admin">
      <section className="page projects-flow-page">
        <div className="eyebrow">EXECUÇÃO & ROADMAP</div>
        <div className="page-heading"><div><h1>Projetos</h1><p>Projetos e entregáveis reais ficam persistidos no Workspace e alimentam Documentos, horas, histórico e validações.</p></div></div>

        {projects.isError && <section className="project-real-data-gate tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface"><AlertTriangle size={24} /><div><h2>Não foi possível validar a base de projetos.</h2><p>{projects.error.message}</p></div></section>}
      </section>
    </Shell>
  );
}
