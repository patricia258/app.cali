import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoCompany, demoDeliverables } from '../../data/demo';

const statusLabel = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  standby: 'Em espera',
  internal_review: 'Revisão CALI',
  client_review: 'Aguardando validação',
  adjustment_requested: 'Ajuste solicitado',
  rebriefing: 'Rebriefing',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

export function ClientDashboard() {
  return (
    <Shell role="client">
      <section className="page">
        <div className="client-context">
          <div className="company-logo">A</div>
          <div><span>ESPAÇO COMPARTILHADO</span><strong>{demoCompany.name} × CALI RH</strong></div>
        </div>
        <div className="page-heading">
          <div>
            <h1>Olá, Grupo Aurora.</h1>
            <p>Acompanhe o que está em movimento, valide entregas e consulte o histórico do trabalho com a CALI.</p>
          </div>
        </div>

        <section className="hero-attention">
          <div>
            <span className="section-kicker light">AGUARDANDO VOCÊ</span>
            <h2>1 entrega está pronta para sua validação.</h2>
            <p>A Estrutura de indicadores de People foi concluída e está disponível para leitura e aprovação.</p>
          </div>
          <Link className="light-button" to="/cliente/entregaveis">Revisar entregável <ChevronRight size={18} /></Link>
        </section>

        <div className="client-summary">
          <div>
            <span>Horas neste ciclo</span>
            <strong>24h10 <small>de 30h</small></strong>
            <Progress value={81} />
            <p>Próximo alerta automático ao atingir 85%.</p>
          </div>
          <div>
            <span>Projeto atual</span>
            <strong>62%</strong>
            <Progress value={62} />
            <p>3 de 5 entregáveis concluídos.</p>
          </div>
          <div>
            <span>Satisfação</span>
            <strong>4,9 <small>/ 5</small></strong>
            <div className="stars">★★★★★</div>
            <p>Média das últimas avaliações enviadas.</p>
          </div>
        </div>

        <div className="dashboard-grid client-grid">
          <section className="panel">
            <div className="panel-title">
              <div><span className="section-kicker">PROJETO EM ANDAMENTO</span><h2>Estruturação People · Ciclo 01</h2></div>
              <Link to="/cliente/entregaveis">Ver projeto</Link>
            </div>
            <div className="deliverable-list">
              {demoDeliverables.map((deliverable) => (
                <div className="deliverable" key={deliverable.id}>
                  <div className="check"><CheckCircle2 size={19} /></div>
                  <div>
                    <strong>{deliverable.title}</strong>
                    <span className={`status ${deliverable.status === 'client_review' ? 'needs-action' : ''}`}>{statusLabel[deliverable.status]}</span>
                    <Progress value={deliverable.progress} />
                  </div>
                  <div className="deliverable-meta"><span>{deliverable.dueLabel}</span><small>{deliverable.hours.toFixed(1)}h</small></div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-title">
              <div><span className="section-kicker">PRÓXIMOS PASSOS</span><h2>Agenda compartilhada</h2></div>
              <Link to="/cliente/cronograma">Abrir</Link>
            </div>
            <div className="event"><div className="date"><strong>31</strong><span>AGO</span></div><div><strong>Reunião mensal</strong><p>09:30 · Remota</p></div></div>
            <div className="event"><div className="date"><strong>03</strong><span>SET</span></div><div><strong>Validação de indicadores</strong><p>14:00 · Remota</p></div></div>
            <div className="consultant"><div className="avatar large">PL</div><div><span>SUA CONSULTORA</span><strong>Patrícia Lima</strong><p>Última atualização hoje, às 16:42.</p></div></div>
          </section>
        </div>
      </section>
    </Shell>
  );
}
