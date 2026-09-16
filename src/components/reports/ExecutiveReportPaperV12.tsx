import { Building2, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { reportTypeLabel, type ReportEditor, type ReportType } from '../../lib/reportComposition';
import {
  feedbackDirection, groupHours, hoursLabelFromMinutes, packageLabel,
  shouldShowNextCycle, upgradeSignal, type IntelligenceSnapshot,
} from '../../lib/reportIntelligence';

type Company = { name: string; logoUrl?: string | null } | null;

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}
function clamp(value: number) { return Math.min(100, Math.max(0, value)); }
function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}
function monthShort(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '').replace(/^./, (c) => c.toUpperCase());
}
function recordTypeLabel(value: string) {
  const map: Record<string, string> = {
    meeting: 'Reunião', occurrence: 'Ocorrência', decision: 'Decisão', request: 'Solicitação',
    people_movement: 'Movimentação de pessoas', leadership: 'Liderança', risk: 'Risco',
    context_change: 'Mudança de contexto', client_input: 'Informação do cliente',
    cali_perception: 'Percepção CALI', milestone: 'Marco', other: 'Registro',
  };
  return map[value] || 'Registro';
}

function FeedbackTrend({ snapshot }: { snapshot: IntelligenceSnapshot }) {
  const points = snapshot.monthlySeries.filter((item) => item.feedbackAverage !== null);
  if (!points.length) return <div className="reports-v12-feedback-empty">Sem avaliações recebidas no período analisado.</div>;
  const width = 420;
  const height = 92;
  const padX = 18;
  const padY = 14;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2);
    const score = Number(point.feedbackAverage || 0);
    const y = height - padY - ((score - 1) / 4) * (height - padY * 2);
    return { ...point, x, y, score };
  });
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const direction = feedbackDirection(snapshot);
  const current = coords[coords.length - 1];
  return <div className="reports-v12-feedback-chart">
    <div className="reports-v12-feedback-head">
      <div><small>MÉDIA MAIS RECENTE</small><strong>{current.score.toFixed(1).replace('.', ',')} / 5</strong></div>
      <div className={`reports-v12-feedback-direction ${direction}`}>{direction === 'up' ? <TrendingUp size={15} /> : direction === 'down' ? <TrendingDown size={15} /> : null}<span>{direction === 'up' ? 'tendência positiva' : direction === 'down' ? 'atenção à tendência' : 'percepção estável'}</span></div>
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução da satisfação">
      {[1, 2, 3, 4, 5].map((score) => {
        const y = height - padY - ((score - 1) / 4) * (height - padY * 2);
        return <line key={score} x1={padX} y1={y} x2={width - padX} y2={y} className="grid" />;
      })}
      {coords.length > 1 && <polyline points={polyline} className="trend" />}
      {coords.map((point) => <g key={point.monthRef}><circle cx={point.x} cy={point.y} r="4" /><text x={point.x} y={height - 2} textAnchor="middle">{monthShort(point.monthRef)}</text></g>)}
    </svg>
  </div>;
}

export function ExecutiveReportPaperV12({ company, snapshot, editor, reportType, periodName, protocol }: {
  company: Company;
  snapshot: IntelligenceSnapshot;
  editor: ReportEditor;
  reportType: ReportType;
  periodName: string;
  protocol: string;
}) {
  const contractedMinutes = Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0) * 60;
  const consumedMinutes = Number(snapshot.hours.consumedMinutes || 0);
  const balanceMinutes = contractedMinutes - consumedMinutes;
  const usagePct = contractedMinutes > 0 ? (consumedMinutes / contractedMinutes) * 100 : 0;
  const hourGroups = groupHours(snapshot);
  const flowTotal = Math.max(1, snapshot.deliverables.approvedCount + snapshot.deliverables.inProgressCount + snapshot.deliverables.clientReviewCount);
  const reportRecords = snapshot.records.filter((record) => record.includeInReport).slice(0, 8);
  const dependencies = snapshot.dependencies.items.slice(0, 8);
  const upgrade = upgradeSignal(snapshot);
  const showNext = shouldShowNextCycle(snapshot, reportType) && lines(editor.nextSteps).length > 0;
  const activeWorkstreams = snapshot.workstreams.filter((item) => item.status === 'active');
  const workstreams = (activeWorkstreams.length ? activeWorkstreams : snapshot.workstreams).slice(0, 6);
  const service = packageLabel(snapshot);

  return <article className="reports-v12-paper">
    <span className="reports-v12-watermark oak" aria-hidden="true" />
    <span className="reports-v12-watermark lime" aria-hidden="true" />

    <header className="reports-v12-paper-header">
      <div className="reports-v12-brand"><strong>CALI</strong><span>RH PARA O NEGÓCIO</span></div>
      {company?.logoUrl ? <img src={company.logoUrl} alt={`Logo ${company.name}`} /> : <span className="reports-v12-company-fallback"><Building2 size={18} /></span>}
    </header>

    <section className="reports-v12-title">
      <div className="reports-v12-title-meta"><span>{company?.name || snapshot.companyName}</span><b>{service}</b></div>
      <h1>Relatório {reportTypeLabel[reportType]}</h1>
      <p>{periodName}</p>
      <small>{snapshot.cycleContext?.projectName || snapshot.projects[0]?.name || 'Ciclo de atuação CALI'} · Protocolo {protocol}</small>
    </section>

    <section className="reports-v12-section executive">
      <span>SÍNTESE EXECUTIVA</span>
      <div className="reports-v12-executive-copy">{(editor.summary || 'Síntese ainda não registrada.').split(/\n\n+/).map((paragraph, index) => <p key={`summary-${index}`}>{paragraph}</p>)}</div>
    </section>

    <section className="reports-v12-section hours">
      <span>HORAS E ADERÊNCIA DO PACOTE</span>
      <div className="reports-v12-hours-stats">
        <div><small>CONTRATADAS</small><strong>{contractedMinutes ? hoursLabelFromMinutes(contractedMinutes) : '—'}</strong></div>
        <div><small>REALIZADAS</small><strong>{hoursLabelFromMinutes(consumedMinutes)}</strong></div>
        <div><small>SALDO</small><strong className={balanceMinutes < 0 ? 'danger' : ''}>{contractedMinutes ? hoursLabelFromMinutes(Math.abs(balanceMinutes)) : '—'}</strong><em>{balanceMinutes < 0 ? 'excedente' : 'disponível'}</em></div>
      </div>
      {contractedMinutes > 0 && <>
        <div className="reports-v12-usage-track"><i style={{ width: `${clamp(usagePct)}%` }} /></div>
        <div className={`reports-v12-usage-note ${usagePct > 100 ? 'critical' : usagePct >= 85 ? 'watch' : ''}`}><strong>{Math.round(usagePct)}% consumido</strong><span>{usagePct > 100 ? `A carga foi superada em ${hoursLabelFromMinutes(Math.abs(balanceMinutes))}.` : `${hoursLabelFromMinutes(Math.max(0, balanceMinutes))} permanecem disponíveis no período.`}</span></div>
      </>}
      {hourGroups.length > 0 && <div className="reports-v12-hour-distribution">
        <div className="reports-v12-distribution-bar">{hourGroups.map((group, index) => <i key={group.label} className={`part p${index % 6}`} style={{ width: `${group.percent}%` }} />)}</div>
        <div className="reports-v12-distribution-legend">{hourGroups.map((group, index) => <span key={group.label}><i className={`p${index % 6}`} /><b>{group.label}</b><em>{Math.round(group.percent)}% · {hoursLabelFromMinutes(group.minutes)}</em></span>)}</div>
      </div>}
    </section>

    <section className="reports-v12-section execution">
      <span>EVOLUÇÃO DO CICLO</span>
      <div className="reports-v12-flow">
        <div className="reports-v12-flow-bar"><i className="approved" style={{ width: `${(snapshot.deliverables.approvedCount / flowTotal) * 100}%` }} /><i className="progress" style={{ width: `${(snapshot.deliverables.inProgressCount / flowTotal) * 100}%` }} /><i className="validation" style={{ width: `${(snapshot.deliverables.clientReviewCount / flowTotal) * 100}%` }} /></div>
        <div className="reports-v12-flow-legend"><span><i className="approved" />{snapshot.deliverables.approvedCount} aprovado(s)</span><span><i className="progress" />{snapshot.deliverables.inProgressCount} em andamento</span><span><i className="validation" />{snapshot.deliverables.clientReviewCount} em validação</span></div>
      </div>
      {workstreams.length > 0 && <div className="reports-v12-workstreams">{workstreams.map((item) => <article key={item.id}><div><strong>{item.name}</strong><span>{item.status === 'active' ? 'em curso' : item.status === 'completed' ? 'concluída' : 'planejada'}</span></div>{item.objective && <p>{item.objective}</p>}</article>)}</div>}
      {lines(editor.movements).length > 0 && <ul className="reports-v12-list-copy">{lines(editor.movements).map((item, index) => <li key={`movement-${index}`}>{item}</li>)}</ul>}
    </section>

    {reportRecords.length > 0 && <section className="reports-v12-section records">
      <span>REGISTROS RELEVANTES DO PERÍODO</span>
      <div className="reports-v12-record-list">{reportRecords.map((record) => <article key={record.id}><time>{dateLabel(record.occurredAt)}</time><div><small>{recordTypeLabel(record.type)}</small><strong>{record.title}</strong>{record.summary && <p>{record.summary}</p>}</div></article>)}</div>
    </section>}

    {(dependencies.length > 0 || lines(editor.decisions).length > 0) && <section className="reports-v12-section dependencies">
      <span>DECISÕES E DEPENDÊNCIAS</span>
      {dependencies.length > 0 && <div className="reports-v12-dependency-list">{dependencies.map((item, index) => <article key={`${item.protocol || item.title}-${index}`}><div><strong>{item.title}</strong><span>{item.responsible === 'client' ? 'Aguardando cliente' : item.responsible === 'flow' ? 'Dependência de fluxo' : 'Dependência compartilhada'}</span></div><p>{item.detail || 'Dependência aberta para continuidade do ciclo.'}</p>{(item.dueAt || item.delayBusinessDays > 0) && <small>{item.dueAt ? `Prazo/retorno: ${dateLabel(item.dueAt)}` : ''}{item.dueAt && item.delayBusinessDays > 0 ? ' · ' : ''}{item.delayBusinessDays > 0 ? `Impacto: +${item.delayBusinessDays} dia(s) útil(eis)` : ''}</small>}</article>)}</div>}
      {lines(editor.decisions).length > 0 && <ul className="reports-v12-list-copy compact">{lines(editor.decisions).map((item, index) => <li key={`decision-${index}`}>{item}</li>)}</ul>}
    </section>}

    <section className="reports-v12-section satisfaction">
      <span>SATISFAÇÃO E EVOLUÇÃO</span>
      <FeedbackTrend snapshot={snapshot} />
      {snapshot.feedback.responses.some((item) => item.comment) && <div className="reports-v12-feedback-comments">{snapshot.feedback.responses.filter((item) => item.comment).slice(0, 3).map((item, index) => <p key={`feedback-comment-${index}`}>“{item.comment}”</p>)}</div>}
    </section>

    {lines(editor.risks).length > 0 && <section className="reports-v12-section attention">
      <span>PONTOS DE ATENÇÃO</span>
      <ul className="reports-v12-list-copy">{lines(editor.risks).map((item, index) => <li key={`risk-${index}`}>{item}</li>)}</ul>
    </section>}

    {upgrade.active && <section className="reports-v12-section package-fit">
      <span>ADERÊNCIA DO PACOTE</span>
      <div><strong>{upgrade.consecutive} períodos consecutivos acima da capacidade prevista</strong><p>{upgrade.message}</p></div>
    </section>}

    {showNext && <section className="reports-v12-section next-cycle">
      <span>{reportType === 'quarterly' ? 'PRÓXIMO TRIMESTRE' : 'TRANSIÇÃO PARA O PRÓXIMO CICLO'}</span>
      <ul className="reports-v12-list-copy">{lines(editor.nextSteps).map((item, index) => <li key={`next-${index}`}>{item}</li>)}</ul>
      <small>O planejamento pode ser reordenado caso novas dependências ou mudanças relevantes de contexto sejam registradas.</small>
    </section>}

    <section className="reports-v12-source-note"><ShieldCheck size={13} /><span>Fonte: ciclo e frentes planejadas, projetos, entregáveis, subtarefas, horas, agenda, registros de reunião e ocorrências, documentos, feedback e histórico preservados no CALI Workspace.</span></section>

    <footer className="reports-v12-paper-footer"><div><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div><small>CALI RH · {protocol}</small></footer>
  </article>;
}
