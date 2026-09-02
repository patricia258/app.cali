import { Building2 } from 'lucide-react';
import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import type { IntelligenceSnapshot } from '../../lib/reportIntelligence';
import {
  deliveryRowsForPdf, deliveryTimingLabelV14, formatHoursV14, reportKpisV14,
  type DeliveryPerformanceRow,
} from '../../lib/reportV14';

type Company = { name: string; logoUrl?: string | null } | null;

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}

function packageLabel(snapshot: IntelligenceSnapshot) {
  const plan = String(snapshot.contract.servicePlan || '').toLowerCase();
  if (plan === 'partner') return 'CALI Partner';
  if (plan === 'full') return 'CALI Full';
  return snapshot.contract.serviceType || 'CALI RH';
}

function statusText(item: DeliveryPerformanceRow) {
  if (item.approved_at) return 'Aprovado';
  if (item.work_closed_at) return 'Execução encerrada';
  if (item.status === 'client_review') return 'Em validação';
  if (item.status === 'in_progress') return 'Em andamento';
  if (item.status === 'not_started') return 'Não iniciado';
  return item.status || 'Em acompanhamento';
}

function workstreamStatus(status: string) {
  if (status === 'completed') return 'Concluída';
  if (status === 'active') return 'Em curso';
  return 'Prevista';
}

export function ExecutiveReportPaperV14({ company, snapshot, editor, reportType, periodName, protocol, deliveries }: {
  company: Company;
  snapshot: IntelligenceSnapshot;
  editor: ReportEditor;
  reportType: ReportType;
  periodName: string;
  protocol: string;
  deliveries: DeliveryPerformanceRow[];
}) {
  const kpis = reportKpisV14(snapshot, deliveries);
  const reportDeliveries = deliveryRowsForPdf(snapshot, deliveries);
  const decisions = lines(editor.decisions).slice(0, 4);
  const risks = lines(editor.risks).slice(0, 3);
  const priorities = lines(editor.nextSteps).slice(0, 3);
  const feedbackComments = snapshot.feedback.responses.map((item) => item.comment?.trim()).filter(Boolean) as string[];
  const feedbackHasSignal = snapshot.feedback.count >= 3 || feedbackComments.length > 0;
  const usagePct = kpis.contractedHours > 0 ? Math.round((kpis.consumedMinutes / 60 / kpis.contractedHours) * 100) : null;
  const workstreams = (snapshot.workstreams || []).slice(0, 6);

  return <article className="reports-v14-document">
    <section className="reports-v14-sheet page-one">
      <header className="reports-v14-paper-header">
        <div className="reports-v14-paper-brand"><strong>CALI</strong><span>HR FOR BUSINESS</span></div>
        <div className="reports-v14-paper-client">
          <div><small>RELATÓRIO EXECUTIVO {reportType === 'quarterly' ? 'TRIMESTRAL' : 'MENSAL'}</small><strong>{company?.name || snapshot.companyName}</strong></div>
          {company?.logoUrl ? <img src={company.logoUrl} alt={`Logo ${company.name}`} /> : <span><Building2 size={18} /></span>}
        </div>
      </header>

      <div className="reports-v14-paper-meta">
        <span>{periodName}</span><i />
        <span>{packageLabel(snapshot)}</span><i />
        <span>{snapshot.cycleContext?.projectName || snapshot.projects[0]?.name || 'Ciclo CALI'}</span>
      </div>

      <section className="reports-v14-paper-summary">
        <span>LEITURA DO PERÍODO</span>
        <div>{(editor.summary || 'Leitura executiva ainda não consolidada.').split(/\n\n+/).slice(0, 2).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </section>

      <section className="reports-v14-paper-kpis">
        <div><small>ENTREGAS</small><strong>{kpis.plannedDeliveries ? `${kpis.completedDeliveries} de ${kpis.plannedDeliveries}` : `${snapshot.deliverables.approvedCount}`}</strong><span>{kpis.plannedDeliveries ? 'previstas no período' : 'aprovadas no período'}</span></div>
        <div><small>ADERÊNCIA AO PRAZO</small><strong>{kpis.deliveryAdherence === null ? '—' : `${kpis.deliveryAdherence}%`}</strong><span>{kpis.deliveryAdherence === null ? 'sem base suficiente' : 'concluídas no/antes do prazo'}</span></div>
        <div><small>HORAS</small><strong>{formatHoursV14(kpis.consumedMinutes)}</strong><span>{kpis.contractedHours ? `de ${kpis.contractedHours}h previstas` : 'registradas'}</span></div>
        <div><small>CICLO</small><strong>{kpis.cyclePosition}</strong><span>{kpis.cycleLabel}</span></div>
      </section>

      {kpis.contractedHours > 0 && <section className="reports-v14-hours-bar">
        <div><span>Capacidade utilizada</span><strong>{usagePct}%</strong></div>
        <div className="track"><i style={{ width: `${Math.min(100, Math.max(0, usagePct || 0))}%` }} /></div>
      </section>}

      {workstreams.length > 0 && <section className="reports-v14-cycle-line">
        <header><span>ANDAMENTO DO CICLO</span><small>onde estamos</small></header>
        <div className="reports-v14-cycle-track">{workstreams.map((item, index) => <div key={item.id} className={`reports-v14-cycle-node ${item.status}`}>
          <i>{index + 1}</i><span><strong>{item.name}</strong><small>{workstreamStatus(item.status)}</small></span>
        </div>)}</div>
      </section>}

      {reportDeliveries.length > 0 && <section className="reports-v14-deliveries">
        <header><span>ENTREGAS DO PERÍODO</span><small>previsto × realizado</small></header>
        <table><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>
          {reportDeliveries.map((item) => <tr key={item.deliverable_id}>
            <td><strong>{item.title}</strong><small>{item.workstream || statusText(item)}</small></td>
            <td>{dateLabel(item.effective_due_at)}</td>
            <td>{dateLabel(item.completion_at)}</td>
            <td><span className={`timing ${item.delivery_timing}`}>{deliveryTimingLabelV14(item)}</span></td>
          </tr>)}
        </tbody></table>
      </section>}

      <footer className="reports-v14-page-number"><span>CALI RH · {protocol}</span><b>1 / 2</b></footer>
    </section>

    <section className="reports-v14-sheet page-two">
      <header className="reports-v14-paper-header compact">
        <div className="reports-v14-paper-brand"><strong>CALI</strong><span>HR FOR BUSINESS</span></div>
        <div className="reports-v14-paper-client"><div><small>{company?.name || snapshot.companyName}</small><strong>{periodName}</strong></div></div>
      </header>

      <div className="reports-v14-page-two-title"><span>LEITURA EXECUTIVA</span><h2>Decisões, riscos e próximo movimento</h2></div>

      {decisions.length > 0 && <section className="reports-v14-paper-block decisions">
        <header><span>DECISÕES RELEVANTES</span><small>o que ficou definido no período</small></header>
        <ol>{decisions.map((item, index) => <li key={index}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>)}</ol>
      </section>}

      {risks.length > 0 && <section className="reports-v14-paper-block risks">
        <header><span>PONTOS DE ATENÇÃO</span><small>risco + encaminhamento</small></header>
        <div>{risks.map((item, index) => {
          const [risk, action] = item.split(/\s*→\s*|\s*\|\s*/).map((part) => part.trim());
          return <article key={index}><i /><span><strong>{risk}</strong>{action && <small>{action}</small>}</span></article>;
        })}</div>
      </section>}

      {priorities.length > 0 && <section className="reports-v14-paper-block priorities">
        <header><span>PRIORIDADES DO PRÓXIMO CICLO</span><small>máximo de três movimentos</small></header>
        <ol>{priorities.map((item, index) => <li key={index}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>)}</ol>
      </section>}

      {feedbackHasSignal && <section className="reports-v14-paper-feedback">
        <div><small>PERCEPÇÃO DO CLIENTE</small>{snapshot.feedback.count >= 3 && snapshot.feedback.average !== null ? <strong>{Number(snapshot.feedback.average).toFixed(1).replace('.', ',')} / 5</strong> : <strong>Feedback qualitativo</strong>}<span>{snapshot.feedback.count >= 3 ? `${snapshot.feedback.count} resposta(s) no período` : 'amostra pequena — leitura qualitativa'}</span></div>
        {feedbackComments[0] && <p>“{feedbackComments[0]}”</p>}
      </section>}

      {!decisions.length && !risks.length && !priorities.length && <section className="reports-v14-paper-empty"><strong>Período sem exceções relevantes.</strong><span>A execução segue registrada no Workspace; esta página permanece reservada apenas para decisões, riscos e prioridades que mereçam leitura executiva.</span></section>}

      <footer className="reports-v14-paper-footer">
        <div><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span><small>patricia@calirh.com · calirh.com</small></div>
        <div className="reports-v14-page-number"><span>{protocol}</span><b>2 / 2</b></div>
      </footer>
    </section>
  </article>;
}
