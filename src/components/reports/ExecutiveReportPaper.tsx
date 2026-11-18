import { keysByContent } from '../../lib/keysByContent';
import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import type { IntelligenceSnapshot } from '../../lib/reportIntelligence';
import { formatHoursV14, reportKpisV14, type DeliveryPerformanceRow } from '../../lib/reportCloseMetrics';
import { feedbackLabelV16 } from '../../lib/reportReviewAndFeedback';
import { periodChangeSignalsV17 } from '../../lib/reportEditorial';
import { augmentReportData, reportManualComplementsFromSnapshot, reportManualMinutes } from '../../lib/reportManualComplements';
import type { ReportVisitCost } from '../../api/reports/paper';
import type { ReportIdentityV55 } from '../../domain/report-identity';
import type { ReportAgendaCompliance } from '../../domain/calendar';
import { ReportAgendaSection } from './components/ReportAgendaSection';
import { ReportValidationBlock } from './ReportValidationBlock';
import { useReportDirectionPagination } from './hooks/useReportDirectionPagination';
import './report-document-a4.css';
import './executive-report-paper.css';

type Company = { name: string; logoUrl?: string | null };
export type ExecutiveReportPaperProps = {
  company: Company;
  snapshot: IntelligenceSnapshot;
  editor: ReportEditor;
  reportType: ReportType;
  periodName: string;
  protocol: string;
  deliveries: DeliveryPerformanceRow[];
  approvalIdentity?: ReportIdentityV55 | null;
  acknowledgementIdentity?: ReportIdentityV55 | null;
  approvedAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgementProtocol?: string | null;
  visitCosts?: ReportVisitCost[];
  agenda?: ReportAgendaCompliance | null;
};
type Metric = { label: string; value: string; detail: string };
type HourGroup = { label: string; minutes: number };
type Attention = { tone: 'client' | 'late' | 'attention'; badge: string; title: string; detail: string; action?: string };

const CALI_LOGO = '/brand/cali-workspace-burgundy.svg';

function lines(value: string) { return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean); }
function clean(value: string | number | null | undefined) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalized(value: string | number | null | undefined) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function formatDate(value?: string | null) { if (!value) return '—'; const date = new Date(`${String(value).slice(0, 10)}T12:00:00`); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date); }
function periodRange(snapshot: IntelligenceSnapshot) { return `${formatDate(snapshot.period.start)} a ${formatDate(snapshot.period.end)}`; }
function within(value: string | null | undefined, start: string, end: string) { const day = String(value || '').slice(0, 10); return Boolean(day && day >= start && day <= end); }
function chunkRows<T>(rows: T[], size: number) { const chunks: T[][] = []; for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size)); return chunks; }

function hourCategory(category: string, description: string, deliverableId?: string | null) {
  const value = normalized(`${category} ${description}`);
  if (/ocorr|solicit|request/.test(value)) return 'Ocorrências e solicitações';
  if (/subtarefa|tarefa|task/.test(value)) return 'Subtarefas';
  if (/reun|meeting|call|alinh|agenda|checkpoint/.test(value)) return 'Reuniões e alinhamentos';
  if (/document|relatorio|politica|manual|procedimento/.test(value)) return 'Documentação';
  if (/anal|consult|diagnost|estrateg|estudo|pesquisa/.test(value)) return 'Análise e consultoria';
  if (deliverableId || /entreg|execuc|produc|projeto/.test(value)) return 'Projetos e entregáveis';
  return 'Outros';
}
function groupHours(snapshot: IntelligenceSnapshot): HourGroup[] {
  const map = new Map<string, number>();
  if (snapshot.hours.entries.length) snapshot.hours.entries.forEach((entry) => { const label = hourCategory(entry.category || '', entry.description || '', entry.deliverableId); map.set(label, (map.get(label) || 0) + Number(entry.minutes || 0)); });
  else snapshot.hours.categories.forEach((entry) => { const label = hourCategory(entry.label || '', '', null); map.set(label, (map.get(label) || 0) + Number(entry.minutes || 0)); });
  return Array.from(map.entries()).map(([label, minutes]) => ({ label, minutes })).filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes).slice(0, 6);
}
/* Política de capacidade mensal (documento da proprietária, 2026-10-13): histórico de utilização dos fechamentos dentro da
   vigência do pacote (Partner 8 meses, Full 12, demais 6), número da ocorrência de excedente e textos oficiais.
   Nada aqui afirma cobrança, upgrade obrigatório ou interrupção. */
function capacityHistory(snapshot: IntelligenceSnapshot, contractedMinutes: number, usedMinutes: number, periodName: string) {
  const plan = String(snapshot.contract.servicePlan || '').toLowerCase(); const windowMonths = plan === 'partner' ? 8 : plan === 'full' ? 12 : 6;
  const previous = [...snapshot.previousReports].filter((item) => Number(item.contractedHours || 0) > 0).sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart))).slice(-(windowMonths - 1))
    .map((item) => { const contracted = Number(item.contractedHours || 0) * 60, used = Math.max(0, Number(item.consumedMinutes || 0)); return { label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(`${String(item.periodStart).slice(0, 10)}T12:00:00`)).replace('.', ''), percent: Math.round((used / contracted) * 1000) / 10, over: used > contracted }; });
  const currentOver = contractedMinutes > 0 && usedMinutes > contractedMinutes;
  const rows = [...previous, { label: periodName, percent: contractedMinutes ? Math.round((usedMinutes / contractedMinutes) * 1000) / 10 : 0, over: currentOver }];
  return { rows, windowMonths, occurrence: currentOver ? previous.filter((item) => item.over).length + 1 : 0 };
}
function relevantDeliveries(snapshot: IntelligenceSnapshot, rows: DeliveryPerformanceRow[]) {
  const start = snapshot.period.start.slice(0, 10), end = snapshot.period.end.slice(0, 10);
  return rows.filter((item) => {
    const status = normalized(item.status);
    const manual = Boolean(item.manual_source);
    const ongoing = !item.completion_at && (status.includes('progress') || status.includes('review') || status.includes('adjust')) && (!item.actual_started_at || item.actual_started_at.slice(0, 10) <= end);
    return manual || ongoing || within(item.effective_due_at, start, end) || within(item.completion_at, start, end) || within(item.actual_started_at, start, end);
  }).sort((a, b) => String(a.effective_due_at || a.completion_at || '').localeCompare(String(b.effective_due_at || b.completion_at || '')));
}
function deliveryState(item: DeliveryPerformanceRow, referenceEnd: string) {
  const status = normalized(item.status);
  const manual = Boolean(item.manual_source);
  if (manual && status.includes('completed') && !item.completion_at) return { label: 'Concluído', tone: 'ok', detail: '' };
  if (item.completion_at) {
    if (item.delivery_timing === 'before_deadline') return { label: 'Entregue antes do prazo', tone: 'ok', detail: `Concluído em ${formatDate(item.completion_at)}` };
    if (item.delivery_timing === 'on_time') return { label: 'Entregue no prazo', tone: 'ok', detail: `Concluído em ${formatDate(item.completion_at)}` };
    if (item.delivery_timing === 'after_deadline') return { label: 'Entregue fora do prazo', tone: 'late', detail: `Concluído em ${formatDate(item.completion_at)}` };
    return { label: 'Concluído', tone: 'ok', detail: `Concluído em ${formatDate(item.completion_at)}` };
  }
  if (item.effective_due_at && item.effective_due_at.slice(0, 10) < referenceEnd && !status.includes('cancel')) return { label: 'Atrasado', tone: 'late', detail: `Prazo ${formatDate(item.effective_due_at)}` };
  if (status.includes('review') || status.includes('valid')) return { label: 'Aguardando validação', tone: 'client', detail: 'Retorno do cliente pendente' };
  if (status.includes('adjust')) return { label: 'Em ajuste', tone: 'client', detail: 'Ajuste em andamento' };
  if (status.includes('progress') || item.actual_started_at) return { label: 'Em andamento', tone: '', detail: item.actual_started_at ? `Iniciado em ${formatDate(item.actual_started_at)}` : '' };
  return { label: status.includes('cancel') ? 'Cancelado' : 'Não iniciado', tone: '', detail: '' };
}
function isNoiseDecision(value: string) { const text = normalized(value); return text.length < 9 || /timer (iniciado|pausado|finalizado)|enviado para validacao|^teste\b|^tetse\b|^ok\b/.test(text); }
function humanizePriority(value: string) {
  const text = clean(value);
  const resolve = text.match(/^Resolver\s+(.+?)\s+antes da transição de ciclo\.?$/i); if (resolve) return `Concluir a pendência em ${resolve[1]} para liberar a transição para o próximo ciclo.`;
  const prepare = text.match(/^Preparar a entrada da frente\s+(.+?)\.?$/i); if (prepare) return `Preparar o início da frente ${prepare[1]}, com escopo e dependências alinhados.`;
  return text;
}
function attentionItems(snapshot: IntelligenceSnapshot, risks: string[]): Attention[] {
  const ref = String(snapshot.generatedAt || snapshot.period.end).slice(0, 10);
  const dependencies = snapshot.dependencies.items.slice(0, 3).map((item): Attention => {
    const due = String(item.dueAt || '').slice(0, 10), client = normalized(item.responsible) === 'client', late = Number(item.delayBusinessDays || 0) > 0 || Boolean(due && due < ref && !['resolved', 'approved', 'closed'].includes(normalized(item.status)));
    return { tone: late ? 'late' : client ? 'client' : 'attention', badge: late ? 'Atrasado' : client ? 'Ação do cliente' : 'Atenção', title: item.kind === 'project_review' ? 'Validação do cronograma pendente' : client ? 'Retorno necessário para continuidade' : 'Dependência aberta no ciclo', detail: client ? `A continuidade de ${item.title || 'esta etapa'} depende de uma validação do cliente. O item permanece aberto até que o retorno seja registrado no Workspace.` : `${item.title || 'Esta etapa'} possui uma dependência aberta que precisa ser resolvida para manter o fluxo previsto.`, action: due ? `${client ? 'Próxima ação: revisar e responder até' : 'Prazo de referência:'} ${formatDate(due)}.` : undefined };
  });
  const dependencyText = snapshot.dependencies.items.map((item) => normalized(item.title));
  const manual = risks.filter((risk) => !dependencyText.some((title) => title && normalized(risk).includes(title))).slice(0, Math.max(0, 3 - dependencies.length)).map((risk): Attention => ({ tone: 'attention', badge: 'Atenção', title: 'Ponto para acompanhamento', detail: risk }));
  return [...dependencies, ...manual].slice(0, 3);
}

export function ExecutiveReportPaper({ company, snapshot, editor, reportType, periodName, protocol, deliveries, approvalIdentity, acknowledgementIdentity, approvedAt, acknowledgedAt, acknowledgementProtocol, visitCosts = [], agenda }: ExecutiveReportPaperProps) {
  const manualComplements = reportManualComplementsFromSnapshot(snapshot);
  const manualMinutes = reportManualMinutes(manualComplements);
  const augmented = augmentReportData(snapshot, deliveries, manualComplements);
  snapshot = augmented.snapshot; deliveries = augmented.deliveries;
  const clientLogo = company.logoUrl || null;
  const kpis = reportKpisV14(snapshot, deliveries), usedMinutes = Math.max(0, Number(kpis.consumedMinutes || 0)), contractedMinutes = Math.max(0, Number(kpis.contractedHours || 0) * 60), usagePercent = contractedMinutes ? Math.round((usedMinutes / contractedMinutes) * 1000) / 10 : null;
  const hours = groupHours(snapshot), usedWidth = contractedMinutes ? Math.min(100, (usedMinutes / contractedMinutes) * 100) : 0;
  const deliveryRows = relevantDeliveries(snapshot, deliveries), changes = periodChangeSignalsV17(snapshot, reportType).filter((item) => normalized(item.value) !== 'novo dado');
  const inlineDeliveryRows = deliveryRows.length <= 4 ? deliveryRows : [];
  const executionPages = deliveryRows.length > 4 ? chunkRows(deliveryRows, 8) : [];
  const attentions = attentionItems(snapshot, lines(editor.risks)), decisions = lines(editor.decisions).filter((item) => !isNoiseDecision(item)).slice(0, 4), nextSteps = lines(editor.nextSteps).map(humanizePriority).filter((item) => normalized(item).length >= 12 && !/^(teste|tetse|ok)\b/.test(normalized(item))).slice(0, 3);
  const feedback = snapshot.feedback.responses.filter((item) => item.comment?.trim()).slice(0, 1), feedbackLabel = feedbackLabelV16(snapshot);
  const metrics: Metric[] = [];
  if (kpis.plannedDeliveries > 0) metrics.push({ label: 'Entregas previstas', value: `${kpis.completedDeliveries}/${kpis.plannedDeliveries}`, detail: 'concluídas entre as previstas' });
  if (kpis.deliveryAdherence !== null) metrics.push({ label: 'Aderência ao prazo', value: `${kpis.deliveryAdherence}%`, detail: 'das conclusões avaliadas' });
  if (snapshot.feedback.count >= 2 && feedbackLabel) metrics.push({ label: 'Percepção do cliente', value: feedbackLabel, detail: `${snapshot.feedback.count} avaliações no período` });
  const directionSections = [
    attentions.length ? {
      id: 'attention',
      content: <>
        <div className="reports-v16-section-head compact"><div><small>PONTOS DE ATENÇÃO</small><h2>O que precisa ser resolvido</h2></div></div>
        {keysByContent(attentions, (item) => item.title).map(({ item, key }) => (
          <article className="reports-v19-attention" key={key}>
            <div><span className={`reports-v19-pill ${item.tone}`}>{item.badge}</span></div>
            <div><h3>{item.title}</h3><p>{item.detail}</p>{item.action ? <small>{item.action}</small> : null}</div>
          </article>
        ))}
      </>,
    } : null,
    decisions.length ? {
      id: 'decisions',
      content: <>
        <div className="reports-v16-section-head compact"><div><small>DECISÕES DO PERÍODO</small><h2>O que foi definido</h2></div></div>
        <ol className="reports-v19-simple-list">
          {keysByContent(decisions, (item) => item).map(({ item, key }, index) => (
            <li key={key}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>
          ))}
        </ol>
      </>,
    } : null,
    nextSteps.length ? {
      id: 'next-steps',
      content: <>
        <div className="reports-v16-section-head compact"><div><small>{reportType === 'quarterly' ? 'PRÓXIMO TRIMESTRE' : 'PRÓXIMO CICLO'}</small><h2>O que entra em movimento agora</h2></div></div>
        <ol className="reports-v19-simple-list">
          {keysByContent(nextSteps, (item) => item).map(({ item, key }, index) => (
            <li key={key}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>
          ))}
        </ol>
      </>,
    } : null,
    feedback[0]?.comment ? {
      id: 'feedback',
      content: <>
        <div><small>PERCEPÇÃO DO CLIENTE</small>{feedbackLabel ? <strong>{feedbackLabel}</strong> : null}</div>
        <blockquote>“{feedback[0].comment}”</blockquote>
      </>,
    } : null,
  ].filter((section) => section !== null);
  const { titleRef, footerRef, sections, pageStarts } = useReportDirectionPagination(directionSections.map(({ id }) => id));
  const directionStarts = directionSections.length ? [0, ...pageStarts.filter((index) => index < directionSections.length)] : [];
  const hasValidation = Boolean(approvalIdentity || acknowledgementIdentity);
  const totalPages = 1 + executionPages.length + directionStarts.length + (visitCosts.length ? 1 : 0) + (hasValidation ? 1 : 0);
  const directionPage = 2 + executionPages.length;
  const visitPage = 2 + executionPages.length + directionStarts.length;
  const validationPage = visitPage + (visitCosts.length ? 1 : 0);
  const documentType = reportType === 'quarterly' ? 'RELATÓRIO TRIMESTRAL' : 'RELATÓRIO MENSAL', referenceLabel = reportType === 'quarterly' ? 'Trimestre de referência' : 'Mês de referência';

  const header = (label = documentType) => (
    <>
      <header className="reports-v19-header tw:grid! tw:items-start!">
        <div className="reports-v19-brand"><img src={CALI_LOGO} alt="CALI Workspace" /></div>
        <div className="reports-v19-client tw:grid! tw:text-right!">
          <div className="tw:flex! tw:flex-col! tw:items-end!">
            <small>{label}</small>
            <strong>{company.name}</strong>
            <div className="reports-v19-ref tw:flex!">
              <span className="tw:flex! tw:flex-col! tw:items-end!"><small>{referenceLabel}</small><b>{periodName}</b></span>
              <span className="tw:flex! tw:flex-col! tw:items-end!"><small>Período trabalhado</small><b>{periodRange(snapshot)}</b></span>
            </div>
          </div>
          {clientLogo ? <img className="tw:border-0! tw:bg-transparent! tw:object-contain!" src={clientLogo} alt={company.name} /> : <span />}
        </div>
      </header>
      <div className="reports-v19-meta tw:flex! tw:justify-end!"><small>Protocolo</small><strong>{protocol}</strong></div>
    </>
  );
  const deliveryTable = (rows: DeliveryPerformanceRow[]) => <table className="reports-v19-table"><thead><tr><th>Entregável</th><th>Frente</th><th>Complex.</th><th>Prazo</th><th>Status</th></tr></thead><tbody>{rows.map((item) => { const state = deliveryState(item, snapshot.period.end.slice(0, 10)), complexity = item.complexity, manual = Boolean(item.manual_source); return <tr key={item.deliverable_id}><td><div className="reports-v21-delivery-title"><strong>{item.title}</strong>{manual ? <span className="reports-v21-manual-tag">Manual</span> : null}</div>{item.total_minutes ? <small>{formatHoursV14(Number(item.total_minutes))} aplicados</small> : null}</td><td>{item.workstream || '—'}</td><td>{complexity ? <span className="reports-v19-pill">{complexity}</span> : '—'}</td><td>{formatDate(item.effective_due_at)}</td><td><span className={`reports-v19-pill ${state.tone}`}>{state.label}</span>{state.detail ? <small>{state.detail}</small> : null}</td></tr>; })}</tbody></table>;

  return <div className="reports-v16-document tw:mx-auto tw:grid">
    <article className="reports-v16-paper reports-v19-paper reports-v16-paper-one">{header()}
      <section className="reports-v16-reading"><span className="reports-v16-kicker">LEITURA EXECUTIVA CALI</span><h1>O que este período revela.</h1><p>{editor.summary.trim() || 'A leitura executiva deste período ainda está em revisão.'}</p></section>

      {(contractedMinutes > 0 || usedMinutes > 0) ? <section className="reports-v19-capacity"><div className="reports-v16-section-head"><div><small>CAPACIDADE CONTRATADA</small><h2>Como as horas foram utilizadas</h2></div></div><div className="reports-v19-capacity-head tw:flex! tw:items-end! tw:justify-between!"><strong>{usagePercent === null ? formatHoursV14(usedMinutes) : `${String(usagePercent).replace('.', ',')}% utilizado`}</strong><span>{contractedMinutes ? `${formatHoursV14(usedMinutes)} registrados · ${kpis.contractedHours}h disponíveis` : `${formatHoursV14(usedMinutes)} registrados`}</span></div>{contractedMinutes ? <><div className="reports-v19-track tw:overflow-hidden!"><div className="reports-v19-used tw:flex! tw:h-full! tw:overflow-hidden!" style={{ width: `${usedWidth}%` }}>{hours.map((group) => <i className="tw:h-full! tw:min-w-0! tw:basis-0" key={group.label} style={{ flexGrow: group.minutes }} />)}</div></div><div className="reports-v19-scale tw:flex! tw:justify-between!"><span>0h</span><span>{kpis.contractedHours}h contratadas</span></div></> : null}{hours.length ? <div className="reports-v19-legend tw:flex! tw:flex-wrap!">{hours.map((group) => { const pct = contractedMinutes ? (group.minutes / contractedMinutes) * 100 : (group.minutes / Math.max(usedMinutes, 1)) * 100; return <span className="tw:flex! tw:items-center!" key={group.label}><i className="tw:rounded-full!" /><span><b>{group.label}</b> · {formatHoursV14(group.minutes)} ({pct > 0 && pct < 1 ? pct.toFixed(1).replace('.', ',') : Math.round(pct)}% {contractedMinutes ? 'da capacidade' : 'do total'})</span></span>; })}</div> : null}{manualMinutes > 0 ? <p className="reports-v21-manual-note"><span className="reports-v21-manual-tag">Manual</span><strong>{formatHoursV14(manualMinutes)}</strong> complementados neste fechamento por não terem sido registrados no Workspace a tempo.</p> : null}{(() => { const history = capacityHistory(snapshot, contractedMinutes, usedMinutes, periodName); const excess = usedMinutes - contractedMinutes; const pct = (value: number) => `${String(value).replace('.', ',')}%`;
        return <>{contractedMinutes > 0 && excess > 0 ? <p className="reports-v19-note capacity-alert"><strong>Capacidade mensal ultrapassada:</strong> {formatHoursV14(excess)} acima das {kpis.contractedHours}h contratadas ({pct(Math.round((excess / contractedMinutes) * 1000) / 10)} de excedente). {history.occurrence >= 3 ? 'É a terceira ocorrência no período acompanhado.' : history.occurrence === 2 ? 'É a segunda ocorrência no período acompanhado.' : 'É a primeira ocorrência no período acompanhado.'} A utilização da capacidade mensal superou o volume inicialmente contratado. O consumo adicional está registrado no acompanhamento da operação. A CALI avaliará, em conjunto com a liderança, a distribuição das demandas e a necessidade de adequação das prioridades ou da capacidade para os próximos ciclos.</p> : null}
        {contractedMinutes > 0 && history.rows.length > 1 ? <p className="reports-v19-note"><strong>Histórico de utilização ({history.windowMonths} meses de vigência):</strong> {history.rows.map((item) => `${item.label} ${pct(item.percent)}${item.over ? ' (excedente)' : ''}`).join(' · ')}.</p> : null}
        {history.occurrence >= 3 ? <p className="reports-v19-note upgrade"><strong>Recomendação:</strong> o histórico indica que a demanda pode estar acima da capacidade inicialmente planejada. Recomenda-se avaliar a adequação do pacote, as prioridades e as alternativas disponíveis, sujeito à avaliação da CALI em conjunto com a liderança. Qualquer mudança depende de alinhamento e formalização.</p> : null}</>; })()}{contractedMinutes ? <p className="reports-v19-note"><strong>Como funciona a disponibilidade:</strong> conforme contrato, as {kpis.contractedHours}h representam a capacidade reservada para o mês. O uso pode variar e não há obrigação de consumir toda a carga. Horas não utilizadas não são cumulativas nem transferidas para o período seguinte.</p> : null}</section> : null}

      {metrics.length ? <section className="reports-v16-facts"><div className="reports-v16-section-head"><div><small>INDICADORES DO PERÍODO</small><h2>Indicadores com base real</h2></div></div><div className="reports-v16-metrics" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)},minmax(0,1fr))` }}>{metrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.detail}</span></div>)}</div></section> : null}

      {inlineDeliveryRows.length ? <section className="reports-v16-execution-grid" style={{ gridTemplateColumns: '1fr' }}><div className="reports-v16-execution-block"><div className="reports-v16-section-head compact"><div><small>EXECUÇÃO DO PERÍODO</small><h2>Entregas e andamento</h2></div></div>{deliveryTable(inlineDeliveryRows)}</div></section> : null}

      {agenda && <ReportAgendaSection agenda={agenda} />}
      {changes.length ? <section className="reports-v16-changes"><div className="reports-v16-section-head compact"><div><small>COMPARATIVO</small><h2>{reportType === 'quarterly' ? 'Mudanças relevantes dentro do trimestre' : 'Mudanças relevantes desde o último fechamento'}</h2></div></div><div>{changes.map((item) => <article className={`tone-${item.tone}`} key={item.id}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}</div></section> : null}
      <footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{totalPages > 1 ? `1 / ${totalPages}` : '1'}</b></footer>
    </article>

    {executionPages.map((rows, pageIndex) => { const pageNumber = 2 + pageIndex; return <article className="reports-v16-paper reports-v19-paper reports-v19-execution-page" key={`execution-${pageIndex}`}>{header('EXECUÇÃO DO PERÍODO')}<div className="reports-v16-page-two-title reports-v19-page-title reports-v19-execution-title"><span>ENTREGAS</span><h1>{pageIndex === 0 ? 'Entregas e andamento.' : 'Entregas e andamento · continuação.'}</h1></div><section className="reports-v16-execution-grid"><div className="reports-v16-execution-block">{deliveryTable(rows)}</div></section><footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{pageNumber} / {totalPages}</b></footer></article>; })}

    {directionStarts.map((start, index) => (
      <article className="reports-v16-paper reports-v19-paper reports-v16-paper-two" key={directionSections[start].id}>
        {header('DIREÇÃO DO PERÍODO')}
        <div ref={index === 0 ? titleRef : undefined} className="reports-v16-page-two-title reports-v19-page-title">
          <span>{index === 0 ? 'DA LEITURA À AÇÃO' : 'DA LEITURA À AÇÃO · CONTINUAÇÃO'}</span>
          <h1>O que precisa de atenção e qual é o próximo movimento.</h1>
        </div>
        {directionSections.slice(start, directionStarts[index + 1]).map(({ id, content }) => (
          <section
            key={id}
            ref={(element) => { sections.current[id] = element; }}
            className={id === 'feedback' ? 'reports-v16-feedback' : 'reports-v16-editorial-block'}
          >
            {content}
          </section>
        ))}
        <footer ref={index === 0 ? footerRef : undefined} className="reports-v16-footer">
          <span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{directionPage + index} / {totalPages}</b>
        </footer>
      </article>
    ))}

    {visitCosts.length ? <article className="reports-v16-paper reports-v19-paper reports-v19-visit-costs">{header('VISITAS EXTRAS')}<div className="reports-v16-page-two-title reports-v19-page-title"><span>REGISTROS DO PERÍODO</span><h1>Visitas e despesas vinculadas.</h1></div><table className="reports-v19-table"><thead><tr><th>Registro</th><th>Protocolo</th><th>Valor</th></tr></thead><tbody>{visitCosts.map(cost => <tr key={cost.id}><td><strong>{cost.label}</strong></td><td>{cost.protocol}</td><td>{(cost.amountCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>)}</tbody></table><p className="reports-v19-note">Valores registrados para conciliação. Comprovantes ficam no histórico da visita no Workspace; este relatório não emite fatura.</p><footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{visitPage} / {totalPages}</b></footer></article> : null}
    {hasValidation ? <article className="reports-v16-paper reports-v19-paper reports-v16-paper-signature">{header('REGISTRO DO DOCUMENTO')}<ReportValidationBlock approvalIdentity={approvalIdentity} acknowledgementIdentity={acknowledgementIdentity} approvedAt={approvedAt} acknowledgedAt={acknowledgedAt} acknowledgementProtocol={acknowledgementProtocol} /><footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{validationPage} / {totalPages}</b></footer></article> : null}
  </div>;
}
