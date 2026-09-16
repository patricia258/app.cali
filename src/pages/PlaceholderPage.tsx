import { FileText } from 'lucide-react';
import { Shell, type Role } from '../components/WorkspaceShell';

export function PlaceholderPage({ role, title, description }: { role: Role; title: string; description: string }) {
  return (
    <Shell role={role}>
      <section className="page">
        <div className="eyebrow">CALI WORKSPACE</div>
        <div className="page-heading">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        <section className="panel empty-state">
          <FileText size={34} />
          <h2>Estrutura preparada</h2>
          <p>Esta área faz parte da arquitetura do Workspace e será conectada aos dados reais do cliente.</p>
        </section>
      </section>
    </Shell>
  );
}
