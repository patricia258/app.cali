import { useEffect, useState } from 'react';
import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import type { IntelligenceSnapshot } from '../../lib/reportIntelligence';
import { formatHoursV14, reportKpisV14, type DeliveryPerformanceRow } from '../../lib/reportV14';
import { capacitySignalV15 } from '../../lib/reportV15';
import { feedbackLabelV16 } from '../../lib/reportV16';
import { periodChangeSignalsV17 } from '../../lib/reportEditorialV17';
import { augmentReportData, reportManualComplementsFromSnapshot, reportManualMinutes } from '../../lib/reportManualComplements';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { supabase } from '../../lib/supabase';
import { ReportValidationBlockV55, type ReportIdentityV55 } from './ReportValidationV55';

type Company = { name: string; logoUrl?: string | null };
type Props = {
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
};
type CanonicalRecord = {
  approvalIdentity?: ReportIdentityV55 | null;
  acknowledgementIdentity?: ReportIdentityV55 | null;
  approvedAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgementProtocol?: string | null;
  logoUrl?: string | null;
};
type Metric = { label: string; value: string; detail: string };
type HourGroup = { label: string; minutes: number };
type Attention = { tone: 'client' | 'late' | 'attention'; badge: string; title: string; detail: string; action?: string };

const CALI_LOGO = '/brand/cali-workspace-burgundy.svg';
const REPORT_V19_CSS = `
.reports-v19-header{display:grid!important;grid-template-columns:44mm 1fr!important;gap:10mm!important;align-items:start!important;padding:3mm 0 5mm!important;border-bottom:1px solid #DDD4CE!important}.reports-v19-brand img{width:39mm!important;height:15mm!important;object-fit:contain!important;object-position:left center!important}.reports-v19-client{display:grid!important;grid-template-columns:1fr 18mm!important;gap:5mm!important;text-align:right!important}.reports-v19-client>div{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:.8mm!important}.reports-v19-client small,.reports-v19-meta small{font:700 5.8pt/1.2 Inter,Arial,sans-serif!important;letter-spacing:.13em!important;text-transform:uppercase!important;color:#94867F!important}.reports-v19-client strong{font:600 12.5pt/1.15 'Playfair Display',Georgia,serif!important;color:#2B2B2B!important}.reports-v19-client img{width:18mm!important;height:15mm!important;object-fit:contain!important;border:0!important;background:transparent!important}.reports-v19-ref{display:flex!important;gap:5mm!important;margin-top:1.5mm!important}.reports-v19-ref span{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:.5mm!important}.reports-v19-ref b{font:600 7pt/1.25 Inter,Arial,sans-serif!important;color:#5C514C!important}.reports-v19-meta{display:flex!important;justify-content:flex-end!important;gap:2mm!important;padding-top:2.5mm!important;font:600 6.2pt/1.2 Inter,Arial,sans-serif!important;color:#5A1E2D!important}.reports-v19-capacity{padding:5mm 0!important;border-top:1px solid #DDD4CE!important}.reports-v19-capacity-head{display:flex!important;justify-content:space-between!important;align-items:end!important;gap:6mm!important;margin:3mm 0 2mm!important}.reports-v19-capacity-head strong{font:600 16pt/1 'Playfair Display',Georgia,serif!important;color:#5A1E2D!important}.reports-v19-capacity-head span{font:400 6.5pt/1.35 Inter,Arial,sans-serif!important;color:#766A64!important;text-align:right!important}.reports-v19-track{height:4mm!important;background:#EEE7E2!important;border-radius:99px!important;overflow:hidden!important}.reports-v19-used{display:flex!important;height:100%!important;overflow:hidden!important;border-radius:99px!important}.reports-v19-used i{height:100%!important;min-width:0!important}.reports-v19-used i:nth-child(1),.reports-v19-legend span:nth-child(1) i{background:#5A1E2D!important}.reports-v19-used i:nth-child(2),.reports-v19-legend span:nth-child(2) i{background:#7D9278!important}.reports-v19-used i:nth-child(3),.reports-v19-legend span:nth-child(3) i{background:#C67B53!important}.reports-v19-used i:nth-child(4),.reports-v19-legend span:nth-child(4) i{background:#B58C52!important}.reports-v19-used i:nth-child(5),.reports-v19-legend span:nth-child(5) i{background:#88706E!important}.reports-v19-used i:nth-child(n+6),.reports-v19-legend span:nth-child(n+6) i{background:#A9A19B!important}.reports-v19-scale{display:flex!important;justify-content:space-between!important;margin-top:1mm!important;font:500 5.6pt/1.2 Inter,Arial,sans-serif!important;color:#998C85!important}.reports-v19-legend{display:flex!important;flex-wrap:wrap!important;gap:1.5mm 5mm!important;margin-top:2.5mm!important}.reports-v19-legend>span{display:flex!important;align-items:center!important;gap:1.2mm!important;font:500 5.9pt/1.3 Inter,Arial,sans-serif!important;color:#5C534F!important}.reports-v19-legend i{width:2mm!important;height:2mm!important;border-radius:50%!important}.reports-v19-legend b{font-weight:650!important}.reports-v19-note{margin:2.6mm 0 0!important;padding-left:3mm!important;border-left:1.5px solid #B58C52!important;font:400 6.1pt/1.48 Inter,Arial,sans-serif!important;color:#6A5F59!important}.reports-v19-note.upgrade{border-left-color:#5A1E2D!important;color:#4D423E!important}.reports-v19-table{width:100%!important;table-layout:fixed!important;border-collapse:collapse!important}.reports-v19-table th{padding:1.6mm 1.5mm 1.8mm 0!important;border-bottom:1px solid #5A1E2D!important;font:700 5.8pt/1.2 Inter,Arial,sans-serif!important;letter-spacing:.08em!important;text-transform:uppercase!important;text-align:left!important;color:#80736D!important}.reports-v19-table td{padding:2.2mm 1.5mm 2.2mm 0!important;border-bottom:1px solid #EEE8E3!important;vertical-align:top!important;font:400 6.8pt/1.35 Inter,Arial,sans-serif!important;color:#463E3A!important}.reports-v19-table th:nth-child(1){width:31%!important}.reports-v19-table th:nth-child(2){width:19%!important}.reports-v19-table th:nth-child(3){width:10%!important}.reports-v19-table th:nth-child(4){width:15%!important}.reports-v19-table th:nth-child(5){width:25%!important}.reports-v19-table td strong{display:block!important;font-weight:650!important;color:#302A28!important}.reports-v19-table td small{display:block!important;margin-top:.6mm!important;font-size:5.7pt!important;color:#94877F!important}.reports-v19-pill{display:inline-block!important;padding:.9mm 1.6mm!important;border-radius:99px!important;background:#F1ECE8!important;font:700 5.5pt/1.1 Inter,Arial,sans-serif!important;color:#615650!important}.reports-v19-pill.ok{background:#EAF0E8!important;color:#4D694A!important}.reports-v19-pill.late{background:#F4E8E8!important;color:#823B47!important}.reports-v19-pill.client{background:#F4EDDA!important;color:#80632E!important}.reports-v19-attention{display:grid!important;grid-template-columns:27mm 1fr!important;gap:4mm!important;padding:2.7mm 0!important;border-bottom:1px solid #EEE8E3!important}.reports-v19-attention h3{margin:0!important;font:650 8.6pt/1.3 Inter,Arial,sans-serif!important;color:#332D2A!important}.reports-v19-attention p{margin:1mm 0 0!important;font:400 7pt/1.5 Inter,Arial,sans-serif!important;color:#5D544F!important}.reports-v19-attention small{display:block!important;margin-top:1.1mm!important;font:600 6pt/1.4 Inter,Arial,sans-serif!important;color:#8A7150!important}.reports-v19-simple-list{list-style:none!important;margin:0!important;padding:0!important}.reports-v19-simple-list li{display:grid!important;grid-template-columns:10mm 1fr!important;gap:3mm!important;padding:2.5mm 0!important;border-bottom:1px solid #EEE8E3!important;font:400 7.4pt/1.5 Inter,Arial,sans-serif!important;color:#4F4743!important}.reports-v19-simple-list b{font:600 8.5pt/1.3 'Playfair Display',Georgia,serif!important;color:#B58C52!important}.reports-v19-page-title h1{max-width:160mm!important}.reports-v19-paper .printfriendly,.reports-v19-paper #printfriendly,.reports-v19-paper .pf-button,.reports-v19-paper [data-pf]{display:none!important}@media print{.reports-v19-paper .printfriendly,.reports-v19-paper #printfriendly,.reports-v19-paper .pf-button,.reports-v19-paper [data-pf]{display:none!important}.reports-v19-attention,.reports-v19-simple-list li,.reports-v19-table tr{break-inside:avoid!important;page-break-inside:avoid!important}}
`;

function lines(value: string) { return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean); }
function clean(value: unknown) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalized(value: unknown) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
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
function upgradeRecommendation(snapshot: IntelligenceSnapshot, contractedMinutes: number, usedMinutes: number) {
  if (!contractedMinutes || usedMinutes <= contractedMinutes * 1.05) return '';
  const previous = [...snapshot.previousReports].sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart))).at(-1);
  if (!previous) return '';
  const previousContracted = Math.max(0, Number(previous.contractedHours || 0) * 60);
  const previousUsed = Math.max(0, Number(previous.consumedMinutes || 0));
  if (!previousContracted || previousUsed <= previousContracted * 1.05) return '';
  const recommended = Math.max(1, Math.ceil(((usedMinutes + previousUsed) / 2) / 60));
  return `Por dois fechamentos consecutivos, o consumo ficou mais de 5% acima da capacidade contratada. Recomenda-se revisar o pacote para aproximadamente ${recommended}h/mês, proporcionalmente ao ritmo observado.`;
}
function relevantDeliveries(snapshot: IntelligenceSnapshot, rows: DeliveryPerformanceRow[]) {
  const start = snapshot.period.start.slice(0, 10), end = snapshot.period.end.slice(0, 10);
  return rows.filter((item) => {
    const status = normalized(item.status);
    const manual = Boolean((item as DeliveryPerformanceRow & { manual_source?: boolean }).manual_source);
    const ongoing = !item.completion_at && (status.includes('progress') || status.includes('review') || status.includes('adjust')) && (!item.actual_started_at || item.actual_started_at.slice(0, 10) <= end);
    return manual || ongoing || within(item.effective_due_at, start, end) || within(item.completion_at, start, end) || within(item.actual_started_at, start, end);
  }).sort((a, b) => String(a.effective_due_at || a.completion_at || '').localeCompare(String(b.effective_due_at || b.completion_at || '')));
}
function deliveryState(item: DeliveryPerformanceRow, referenceEnd: string) {
  const status = normalized(item.status);
  const manual = Boolean((item as DeliveryPerformanceRow & { manual_source?: boolean }).manual_source);
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

export function ExecutiveReportPaperV17({ company, snapshot, editor, reportType, periodName, protocol, deliveries, approvalIdentity, acknowledgementIdentity, approvedAt, acknowledgedAt, acknowledgementProtocol }: Props) {
  const manualComplements = reportManualComplementsFromSnapshot(snapshot);
  const manualMinutes = reportManualMinutes(manualComplements);
  const augmented = augmentReportData(snapshot, deliveries, manualComplements);
  snapshot = augmented.snapshot; deliveries = augmented.deliveries;
  const [canonical, setCanonical] = useState<CanonicalRecord | null>(null);
  useEffect(() => {
    if (!supabase || !protocol || protocol === '—') return;
    let cancelled = false;
    async function hydrateCanonical() {
      if (!supabase) return;
      const reportResult = await supabase.from('reports').select('company_id,approval_identity_snapshot,acknowledgement_identity_snapshot,approved_at,acknowledged_at,acknowledgement_protocol').eq('protocol', protocol).maybeSingle();
      if (cancelled || reportResult.error || !reportResult.data) return;
      const row = reportResult.data as any; let logoUrl = '';
      const companyResult = await supabase.from('companies').select('logo_url').eq('id', row.company_id).maybeSingle();
      if (!cancelled && !companyResult.error && companyResult.data?.logo_url) logoUrl = await resolveWorkspaceMedia(companyResult.data.logo_url, 86400, true);
      if (!cancelled) setCanonical({ approvalIdentity: row.approval_identity_snapshot || null, acknowledgementIdentity: row.acknowledgement_identity_snapshot || null, approvedAt: row.approved_at || null, acknowledgedAt: row.acknowledged_at || null, acknowledgementProtocol: row.acknowledgement_protocol || null, logoUrl: logoUrl || null });
    }
    void hydrateCanonical(); const timer = window.setInterval(() => void hydrateCanonical(), 5000); return () => { cancelled = true; window.clearInterval(timer); };
  }, [protocol]);

  const approval = canonical ? canonical.approvalIdentity || null : approvalIdentity, acknowledgement = canonical ? canonical.acknowledgementIdentity || null : acknowledgementIdentity;
  const approved = canonical ? canonical.approvedAt || null : approvedAt, acknowledged = canonical ? canonical.acknowledgedAt || null : acknowledgedAt, acknowledgementCode = canonical ? canonical.acknowledgementProtocol || null : acknowledgementProtocol;
  const clientLogo = canonical?.logoUrl || company.logoUrl || null;
  const kpis = reportKpisV14(snapshot, deliveries), usedMinutes = Math.max(0, Number(kpis.consumedMinutes || 0)), contractedMinutes = Math.max(0, Number(kpis.contractedHours || 0) * 60), usagePercent = contractedMinutes ? Math.round((usedMinutes / contractedMinutes) * 100) : null;
  const hours = groupHours(snapshot), usedWidth = contractedMinutes ? Math.min(100, (usedMinutes / contractedMinutes) * 100) : 0, capacitySignal = capacitySignalV15(snapshot), firstCapacityNotice = capacitySignal.state === 'first_over' ? capacitySignal.message : '', upgrade = upgradeRecommendation(snapshot, contractedMinutes, usedMinutes);
  const deliveryRows = relevantDeliveries(snapshot, deliveries), changes = periodChangeSignalsV17(snapshot, reportType).filter((item) => normalized(item.value) !== 'novo dado');
  const inlineDeliveryRows = deliveryRows.length <= 4 ? deliveryRows : [];
  const executionPages = deliveryRows.length > 4 ? chunkRows(deliveryRows, 8) : [];
  const attentions = attentionItems(snapshot, lines(editor.risks)), decisions = lines(editor.decisions).filter((item) => !isNoiseDecision(item)).slice(0, 4), nextSteps = lines(editor.nextSteps).map(humanizePriority).filter((item) => normalized(item).length >= 12 && !/^(teste|tetse|ok)\b/.test(normalized(item))).slice(0, 3);
  const feedback = snapshot.feedback.responses.filter((item) => item.comment?.trim()).slice(0, 1), feedbackLabel = feedbackLabelV16(snapshot);
  const metrics: Metric[] = [];
  if (kpis.plannedDeliveries > 0) metrics.push({ label: 'Entregas previstas', value: `${kpis.completedDeliveries}/${kpis.plannedDeliveries}`, detail: 'concluídas entre as previstas' });
  if (kpis.deliveryAdherence !== null) metrics.push({ label: 'Aderência ao prazo', value: `${kpis.deliveryAdherence}%`, detail: 'das conclusões avaliadas' });
  if (snapshot.feedback.count >= 2 && feedbackLabel) metrics.push({ label: 'Percepção do cliente', value: feedbackLabel, detail: `${snapshot.feedback.count} avaliações no período` });
  const hasValidation = Boolean(approval || acknowledgement), hasDirection = Boolean(attentions.length || decisions.length || nextSteps.length || feedback.length);
  const totalPages = 1 + executionPages.length + (hasDirection ? 1 : 0) + (hasValidation ? 1 : 0);
  const directionPage = 2 + executionPages.length;
  const validationPage = 2 + executionPages.length + (hasDirection ? 1 : 0);
  const documentType = reportType === 'quarterly' ? 'RELATÓRIO TRIMESTRAL' : 'RELATÓRIO MENSAL', referenceLabel = reportType === 'quarterly' ? 'Trimestre de referência' : 'Mês de referência';

  const header = (label = documentType) => <><header className="reports-v19-header"><div className="reports-v19-brand"><img src={CALI_LOGO} alt="CALI Workspace" /></div><div className="reports-v19-client"><div><small>{label}</small><strong>{company.name}</strong><div className="reports-v19-ref"><span><small>{referenceLabel}</small><b>{periodName}</b></span><span><small>Período trabalhado</small><b>{periodRange(snapshot)}</b></span></div></div>{clientLogo ? <img src={clientLogo} alt={company.name} /> : <span />}</div></header><div className="reports-v19-meta"><small>Protocolo</small><strong>{protocol}</strong></div></>;
  const deliveryTable = (rows: DeliveryPerformanceRow[]) => <table className="reports-v19-table"><thead><tr><th>Entregável</th><th>Frente</th><th>Complex.</th><th>Prazo</th><th>Status</th></tr></thead><tbody>{rows.map((item, index) => { const state = deliveryState(item, snapshot.period.end.slice(0, 10)), complexity = (item as DeliveryPerformanceRow & { complexity?: string | null }).complexity, manual = Boolean((item as DeliveryPerformanceRow & { manual_source?: boolean }).manual_source); return <tr key={`${item.deliverable_id}-${index}`}><td><div className="reports-v21-delivery-title"><strong>{item.title}</strong>{manual ? <span className="reports-v21-manual-tag">Manual</span> : null}</div>{item.total_minutes ? <small>{formatHoursV14(Number(item.total_minutes))} aplicados</small> : null}</td><td>{item.workstream || '—'}</td><td>{complexity ? <span className="reports-v19-pill">{complexity}</span> : '—'}</td><td>{formatDate(item.effective_due_at)}</td><td><span className={`reports-v19-pill ${state.tone}`}>{state.label}</span>{state.detail ? <small>{state.detail}</small> : null}</td></tr>; })}</tbody></table>;

  return <div className="reports-v16-document"><style>{REPORT_V19_CSS}</style>
    <article className="reports-v16-paper reports-v19-paper reports-v16-paper-one">{header()}
      <section className="reports-v16-reading"><span className="reports-v16-kicker">LEITURA EXECUTIVA CALI</span><h1>O que este período revela.</h1><p>{editor.summary.trim() || 'A leitura executiva deste período ainda está em revisão.'}</p></section>

      {(contractedMinutes > 0 || usedMinutes > 0) ? <section className="reports-v19-capacity"><div className="reports-v16-section-head"><div><small>CAPACIDADE CONTRATADA</small><h2>Como as horas foram utilizadas</h2></div></div><div className="reports-v19-capacity-head"><strong>{usagePercent === null ? formatHoursV14(usedMinutes) : `${usagePercent}% utilizado`}</strong><span>{contractedMinutes ? `${formatHoursV14(usedMinutes)} registrados · ${kpis.contractedHours}h disponíveis` : `${formatHoursV14(usedMinutes)} registrados`}</span></div>{contractedMinutes ? <><div className="reports-v19-track"><div className="reports-v19-used" style={{ width: `${usedWidth}%` }}>{hours.map((group) => <i key={group.label} style={{ flexGrow: group.minutes, flexBasis: 0 }} />)}</div></div><div className="reports-v19-scale"><span>0h</span><span>{kpis.contractedHours}h contratadas</span></div></> : null}{hours.length ? <div className="reports-v19-legend">{hours.map((group) => { const pct = contractedMinutes ? (group.minutes / contractedMinutes) * 100 : (group.minutes / Math.max(usedMinutes, 1)) * 100; return <span key={group.label}><i /><span><b>{group.label}</b> · {formatHoursV14(group.minutes)} ({pct > 0 && pct < 1 ? pct.toFixed(1).replace('.', ',') : Math.round(pct)}% {contractedMinutes ? 'da capacidade' : 'do total'})</span></span>; })}</div> : null}{manualMinutes > 0 ? <p className="reports-v21-manual-note"><span className="reports-v21-manual-tag">Manual</span><strong>{formatHoursV14(manualMinutes)}</strong> complementados neste fechamento por não terem sido registrados no Workspace a tempo.</p> : null}{firstCapacityNotice ? <p className="reports-v19-note capacity-alert"><strong>Atenção à capacidade:</strong> {firstCapacityNotice}</p> : null}{contractedMinutes ? <p className="reports-v19-note"><strong>Como funciona a disponibilidade:</strong> conforme contrato, as {kpis.contractedHours}h representam a capacidade reservada para o mês. O uso pode variar e não há obrigação de consumir toda a carga. Horas não utilizadas não são cumulativas nem transferidas para o período seguinte.</p> : null}{upgrade ? <p className="reports-v19-note upgrade"><strong>Recomendação de capacidade:</strong> {upgrade}</p> : null}</section> : null}

      {metrics.length ? <section className="reports-v16-facts"><div className="reports-v16-section-head"><div><small>INDICADORES DO PERÍODO</small><h2>Indicadores com base real</h2></div></div><div className="reports-v16-metrics" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)},minmax(0,1fr))` }}>{metrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.detail}</span></div>)}</div></section> : null}

      {inlineDeliveryRows.length ? <section className="reports-v16-execution-grid" style={{ gridTemplateColumns: '1fr' }}><div className="reports-v16-execution-block"><div className="reports-v16-section-head compact"><div><small>EXECUÇÃO DO PERÍODO</small><h2>Entregas e andamento</h2></div></div>{deliveryTable(inlineDeliveryRows)}</div></section> : null}

      {changes.length ? <section className="reports-v16-changes"><div className="reports-v16-section-head compact"><div><small>COMPARATIVO</small><h2>{reportType === 'quarterly' ? 'Mudanças relevantes dentro do trimestre' : 'Mudanças relevantes desde o último fechamento'}</h2></div></div><div>{changes.map((item) => <article className={`tone-${item.tone}`} key={item.id}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}</div></section> : null}
      <footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{totalPages > 1 ? `1 / ${totalPages}` : '1'}</b></footer>
    </article>

    {executionPages.map((rows, pageIndex) => { const pageNumber = 2 + pageIndex; return <article className="reports-v16-paper reports-v19-paper reports-v19-execution-page" key={`execution-${pageIndex}`}>{header('EXECUÇÃO DO PERÍODO')}<div className="reports-v16-page-two-title reports-v19-page-title reports-v19-execution-title"><span>ENTREGAS</span><h1>{pageIndex === 0 ? 'Entregas e andamento.' : 'Entregas e andamento · continuação.'}</h1></div><section className="reports-v16-execution-grid"><div className="reports-v16-execution-block">{deliveryTable(rows)}</div></section><footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{pageNumber} / {totalPages}</b></footer></article>; })}

    {hasDirection ? <article className="reports-v16-paper reports-v19-paper reports-v16-paper-two">{header('DIREÇÃO DO PERÍODO')}<div className="reports-v16-page-two-title reports-v19-page-title"><span>DA LEITURA À AÇÃO</span><h1>O que precisa de atenção e qual é o próximo movimento.</h1></div>
      {attentions.length ? <section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>PONTOS DE ATENÇÃO</small><h2>O que precisa ser resolvido</h2></div></div>{attentions.map((item, index) => <article className="reports-v19-attention" key={`${item.title}-${index}`}><div><span className={`reports-v19-pill ${item.tone}`}>{item.badge}</span></div><div><h3>{item.title}</h3><p>{item.detail}</p>{item.action ? <small>{item.action}</small> : null}</div></article>)}</section> : null}
      {decisions.length ? <section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>DECISÕES DO PERÍODO</small><h2>O que foi definido</h2></div></div><ol className="reports-v19-simple-list">{decisions.map((item, index) => <li key={`${item}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>)}</ol></section> : null}
      {nextSteps.length ? <section className="reports-v16-editorial-block"><div className="reports-v16-section-head compact"><div><small>{reportType === 'quarterly' ? 'PRÓXIMO TRIMESTRE' : 'PRÓXIMO CICLO'}</small><h2>O que entra em movimento agora</h2></div></div><ol className="reports-v19-simple-list">{nextSteps.map((item, index) => <li key={`${item}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>)}</ol></section> : null}
      {feedback[0]?.comment ? <section className="reports-v16-feedback"><div><small>PERCEPÇÃO DO CLIENTE</small>{feedbackLabel ? <strong>{feedbackLabel}</strong> : null}</div><blockquote>“{feedback[0].comment}”</blockquote></section> : null}
      <footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{directionPage} / {totalPages}</b></footer>
    </article> : null}

    {hasValidation ? <article className="reports-v16-paper reports-v19-paper reports-v16-paper-signature">{header('REGISTRO DO DOCUMENTO')}<ReportValidationBlockV55 approvalIdentity={approval} acknowledgementIdentity={acknowledgement} approvedAt={approved} acknowledgedAt={acknowledged} acknowledgementProtocol={acknowledgementCode} /><footer className="reports-v16-footer"><span>CALI Workspace · Patrícia Lima</span><span>{protocol}</span><b>{validationPage} / {totalPages}</b></footer></article> : null}
  </div>;
}
