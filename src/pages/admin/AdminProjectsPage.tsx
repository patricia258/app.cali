import { useState } from 'react';
import { CheckCircle2, ChevronRight, Clock3, FileText, Plus } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoDeliverables } from '../../data/demo';
import type { DeliverableStatus } from '../../domain/types';

const adminStatus: Record<DeliverableStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  internal_review: 'Aprovação interna',
  client_review: 'Com o cliente',
  adjustment_requested: 'Ajuste solicitado',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

export function AdminProjectsPage() {
  const [view, setView] = useState<'list' | 'flow'>('list');

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">EXECUÇÃO</div>
        <div className="page-heading">
          <div><h1>Projetos</h1><p>Do cronograma aprovado ao fechamento de cada entregável, com horas, validações e histórico no mesmo fluxo.</p></div>
          <button className="primary"><Plus size={18} />Novo cronograma</button>
        </div>

        <section className="project-summary-card">
          <div><span className="section-kicker light">GRUPO AURORA</span><h2>Estruturação People · Ciclo 01</h2><p>19 ago → 18 set · Assessoria Estratégica Mensal</p></div>
          <div className="project-progress"><strong>62%</strong><span>andamento geral</span><Progress value={62} /></div>
        </section>

        <div className="view-switch"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Lista</button><button className={view === 'flow' ? 'active' : ''} onClick={() => setView('flow')}>Fluxo</button></div>

        {view === 'list' ? (
          <section className="panel deliverables-admin-list">
            <div className="panel-title"><div><span className="section-kicker">ENTREGÁVEIS</span><h2>Ciclo em execução</h2></div></div>
            {demoDeliverables.map((item) => (
              <div className="admin-deliverable-row" key={item.id}>
                <div className="deliverable-symbol">{item.isDocument ? <FileText size={20} /> : <Clock3 size={20} />}</div>
                <div><span className="deliverable-code">{item.code}</span><strong>{item.title}</strong><small>{item.workstream}</small></div>
                <span className={`status-pill ${item.status === 'client_review' ? 'action' : item.status === 'approved' ? 'ok' : ''}`}>{adminStatus[item.status]}</span>
                <div className="hours-cell"><span>{item.hours.toFixed(1)}h registradas</span><Progress value={item.progress} /></div>
                <strong>{item.dueLabel}</strong>
                <button className="ghost">Abrir <ChevronRight size={17} /></button>
              </div>
            ))}
          </section>
        ) : (
          <section className="flow-grid">
            {[
              ['Não iniciado', demoDeliverables.filter((item) => item.status === 'not_started')],
              ['Em andamento', demoDeliverables.filter((item) => item.status === 'in_progress')],
              ['Com o cliente', demoDeliverables.filter((item) => item.status === 'client_review')],
              ['Concluído', demoDeliverables.filter((item) => item.status === 'approved')],
            ].map(([label, cards]) => (
              <div className="flow-column" key={label as string}>
                <div className="flow-title"><strong>{label as string}</strong><span>{(cards as typeof demoDeliverables).length}</span></div>
                {(cards as typeof demoDeliverables).map((item) => <article className="flow-card" key={item.id}><span className="deliverable-code">{item.code}</span><strong>{item.title}</strong><small>{item.dueLabel} · {item.hours.toFixed(1)}h</small></article>)}
              </div>
            ))}
          </section>
        )}

        <div className="inline-notice"><CheckCircle2 size={19} />Entregáveis aprovados ficam protegidos contra edição no fluxo normal. Alterações excepcionais devem gerar justificativa e histórico.</div>
      </section>
    </Shell>
  );
}
