import { useEffect, useMemo, useState } from 'react';
import {
  Archive, BarChart3, Building2, CalendarDays, CheckCircle2, Clock3, Eye,
  FileCheck2, FileText, Loader2, MessageSquareText, Pencil, Printer, RefreshCw,
  Save, Send, ShieldCheck, SlidersHorizontal, Sparkles, UsersRound, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import {
  normalizeMonthlySeries, reportTypeLabel,
  type MonthlySeriesPoint, type ReportEditor, type ReportType,
} from '../../lib/reportComposition';

type ReportStatus = 'draft' | 'review' | 'published' | 'archived';
type EditorKey = keyof ReportEditor;

type ManualMetrics = {
  contractedHours: number | null;
  hours: number | null;
  meetings: number | null;
  completedTasks: number | null;
  approvedDeliverables: number | null;
  inProgressDeliverables: number | null;
  validationDeliverables: number | null;
  feedbackAverage: number | null;
  feedbackResponses: number | null;
  lowFeedbackCount: number | null;
  publishedDocuments: number | null;
  pendingDocuments: number | null;
};

type MetricView = {
  contractedHours: number;
  hours: number;
  meetings: number;
  completedTasks: number;
  approvedDeliverables: number;
  inProgressDeliverables: number;
  validationDeliverables: number;
  feedbackAverage: number | null;
  feedbackResponses: number;
  lowFeedbackCount: number;
  publishedDocuments: number;
  pendingDocuments: number;
};

type Company = {
  id: string;
  name: string;
  logoUrl?: string | null;
  monthlyHours: number;
  serviceType?: string | null;
  servicePlan?: string | null;
};

type Snapshot = {
  generatedAt: string;
  companyId: string;
  companyName: string;
  period: { start: string; end: string; months: number };
  contract: {
    serviceType?: string | null;
    servicePlan?: string | null;
    monthlyHours: number;
    contractedHoursPeriod: number;
  };
  projects: Array<{ id: string; protocol?: string | null; name: string; status: string; planningStatus?: string | null }>;
  deliverables: {
    total: number;
    approvedCount: number;
    approved: Array<{ id: string; protocol?: string | null; title: string; approvedAt?: string | null }>;
    createdCount: number;
    inProgressCount: number;
    clientReviewCount: number;
    delayBusinessDays: number;
    delayedCount: number;
    adjustmentCount: number;
    rebriefingCount: number;
    statusChanges: Array<{ title: string; from?: string | null; to?: string | null; note?: string | null; changedAt?: string | null }>;
  };
  tasks: {
    completedCount: number;
    createdCount: number;
    items: Array<{ id: string; title: string; status: string; dueAt?: string | null; completedAt?: string | null }>;
  };
  hours: {
    contractedHours: number;
    consumedMinutes: number;
    entriesCount: number;
    categories: Array<{ label: string; minutes: number }>;
    entries: Array<{ id: string; workDate: string; minutes: number; category?: string | null; description: string }>;
  };
  feedback: {
    count: number;
    average: number | null;
    lowScoreCount: number;
    responses: Array<{ score: number; comment?: string | null; createdAt?: string | null }>;
  };
  events: {
    count: number;
    items: Array<{ id: string; title: string; type?: string | null; startsAt?: string | null }>;
  };
  documents: {
    publishedCount: number;
    published: Array<{ id: string; title: string; category?: string | null; kind?: string | null; publishedAt?: string | null }>;
    awaitingFinalCount: number;
    readyToPublishCount: number;
  };
  conversations: {
    commentCount: number;
    comments: Array<{ body: string; clientVisible: boolean; createdAt?: string | null }>;
  };
  monthlySeries: MonthlySeriesPoint[];
  manualOverrides?: ManualMetrics;
};

type Report = {
  id: string;
  companyId: string;
  title: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  summary: string;
  movements: string[];
  decisions: string[];
  risks: string[];
  nextSteps: string[];
  sourceSnapshot: Snapshot | null;
  protocol: string;
  updatedAt: string;
};

const emptyEditor: ReportEditor = { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' };
const emptyManual: ManualMetrics = {
  contractedHours: null, hours: null, meetings: null, completedTasks: null,
  approvedDeliverables: null, inProgressDeliverables: null, validationDeliverables: null,
  feedbackAverage: null, feedbackResponses: null, lowFeedbackCount: null,
  publishedDocuments: null, pendingDocuments: null,
};
const statusLabel: Record<ReportStatus, string> = {
  draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado',
};

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function monthlyPeriod(date = new Date()) {
  return { start: isoDate(new Date(date.getFullYear(), date.getMonth(), 1)), end: isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)) };
}
function quarterlyPeriod(date = new Date()) {
  const startMonth = Math.floor(date.getMonth() / 3) * 3;
  return { start: isoDate(new Date(date.getFullYear(), startMonth, 1)), end: isoDate(new Date(date.getFullYear(), startMonth + 3, 0)) };
}
function quarterKey(value: string) {
  const [year, month] = value.split('-').map(Number);
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}
function quarterPeriod(value: string) {
  const [yearText, quarterText] = value.split('-Q');
  const year = Number(yearText);
  const quarter = Number(quarterText);
  const startMonth = (quarter - 1) * 3;
  return { start: isoDate(new Date(year, startMonth, 1)), end: isoDate(new Date(year, startMonth + 3, 0)) };
}
function quarterOptions() {
  const currentYear = new Date().getFullYear();
  const options: Array<{ value: string; label: string }> = [];
  for (let year = currentYear + 2; year >= currentYear - 8; year -= 1) {
    for (let quarter = 4; quarter >= 1; quarter -= 1) options.push({ value: `${year}-Q${quarter}`, label: `${quarter}º trimestre · ${year}` });
  }
  return options;
}
function periodLabel(type: ReportType, start: string) {
  const [year, month] = start.split('-').map(Number);
  if (type === 'monthly') return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  return `${Math.floor((month - 1) / 3) + 1}º trimestre de ${year}`;
}
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR').format(date);
}
function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}
function monthShort(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  if (!year || !month) return ref;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '').replace(/^./, (char) => char.toUpperCase());
}
function hoursLabel(hours: number) {
  const safe = Math.max(0, Number(hours || 0));
  const whole = Math.floor(safe);
  const minutes = Math.round((safe - whole) * 60);
  return minutes ? `${whole}h ${String(minutes).padStart(2, '0')}m` : `${whole}h`;
}
function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}
function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function normalizeSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as any;
  if (!raw.period || !raw.contract || !raw.deliverables || !raw.hours) return null;
  return { ...raw, monthlySeries: normalizeMonthlySeries(raw.monthlySeries) } as Snapshot;
}
function reportRow(row: any): Report {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    reportType: (row.report_type || 'monthly') as ReportType,
    periodStart: String(row.period_start || row.reference_month).slice(0, 10),
    periodEnd: String(row.period_end || row.reference_month).slice(0, 10),
    status: row.status as ReportStatus,
    summary: row.executive_summary || '',
    movements: Array.isArray(row.movements) ? row.movements.map(String) : [],
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
    risks: Array.isArray(row.risks) ? row.risks.map(String) : [],
    nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [],
    sourceSnapshot: normalizeSnapshot(row.source_snapshot),
    protocol: row.protocol || '—',
    updatedAt: row.updated_at,
  };
}
function choose(manual: number | null, automatic: number) {
  return manual === null ? Number(automatic || 0) : Number(manual || 0);
}
function metricView(snapshot: Snapshot, manual: ManualMetrics): MetricView {
  return {
    contractedHours: choose(manual.contractedHours, Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0)),
    hours: choose(manual.hours, Number(snapshot.hours.consumedMinutes || 0) / 60),
    meetings: choose(manual.meetings, snapshot.events.count),
    completedTasks: choose(manual.completedTasks, snapshot.tasks.completedCount),
    approvedDeliverables: choose(manual.approvedDeliverables, snapshot.deliverables.approvedCount),
    inProgressDeliverables: choose(manual.inProgressDeliverables, snapshot.deliverables.inProgressCount),
    validationDeliverables: choose(manual.validationDeliverables, snapshot.deliverables.clientReviewCount),
    feedbackAverage: manual.feedbackAverage === null ? snapshot.feedback.average : manual.feedbackAverage,
    feedbackResponses: choose(manual.feedbackResponses, snapshot.feedback.count),
    lowFeedbackCount: choose(manual.lowFeedbackCount, snapshot.feedback.lowScoreCount),
    publishedDocuments: choose(manual.publishedDocuments, snapshot.documents.publishedCount),
    pendingDocuments: choose(manual.pendingDocuments, snapshot.documents.awaitingFinalCount + snapshot.documents.readyToPublishCount),
  };
}
function serviceProfile(snapshot: Snapshot) {
  const raw = `${snapshot.contract.servicePlan || ''} ${snapshot.contract.serviceType || ''}`.toLowerCase();
  if (raw.includes('trein')) return { key: 'training', movement: 'Treinamento e entregas do período', decisions: 'Evidências e alinhamentos', next: 'Recomendações e próximo passo' };
  if (raw.includes('mentor')) return { key: 'mentoring', movement: 'Encontros e temas trabalhados', decisions: 'Evolução e acordos', next: 'Próximo encontro e ciclo' };
  if (raw.includes('partner') || raw.includes('full') || raw.includes('assess') || raw.includes('advis')) return { key: 'advisory', movement: 'Atuação no período', decisions: 'Decisões e dependências', next: 'Próximo ciclo' };
  return { key: 'standard', movement: 'O que foi realizado', decisions: 'Decisões e dependências', next: 'Próximo ciclo' };
}
function automaticReading(snapshot: Snapshot, type: ReportType, manual: ManualMetrics): ReportEditor {
  const metrics = metricView(snapshot, manual);
  const movements: string[] = [];
  const decisions: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  snapshot.deliverables.approved.slice(0, type === 'quarterly' ? 8 : 5).forEach((item) => movements.push(item.title));
  snapshot.tasks.items.filter((item) => item.completedAt).slice(0, 5).forEach((item) => movements.push(item.title));
  snapshot.documents.published.slice(0, 4).forEach((item) => movements.push(`Documento publicado: ${item.title}`));
  if (!movements.length) snapshot.events.items.slice(0, 4).forEach((item) => movements.push(item.title));

  snapshot.deliverables.statusChanges.filter((item) => item.note || item.to).slice(0, 5).forEach((item) => decisions.push(item.note ? `${item.title}: ${item.note}` : `${item.title}: ${item.to}`));
  if (!decisions.length) snapshot.conversations.comments.filter((item) => item.clientVisible).slice(0, 4).forEach((item) => decisions.push(item.body));

  if (snapshot.deliverables.delayedCount) risks.push(`${snapshot.deliverables.delayedCount} entregável(eis) tiveram impacto de prazo, somando ${snapshot.deliverables.delayBusinessDays} dia(s) útil(eis).`);
  if (snapshot.deliverables.adjustmentCount) risks.push(`${snapshot.deliverables.adjustmentCount} solicitação(ões) de ajuste foram registradas.`);
  if (snapshot.deliverables.rebriefingCount) risks.push(`${snapshot.deliverables.rebriefingCount} rebriefing(s) foram necessários no período.`);
  if (metrics.lowFeedbackCount) risks.push(`${metrics.lowFeedbackCount} avaliação(ões) entre 1 e 3 pedem leitura qualitativa.`);
  if (metrics.contractedHours > 0 && metrics.hours / metrics.contractedHours >= .8) risks.push(`O consumo de horas atingiu ${Math.round(metrics.hours / metrics.contractedHours * 100)}% do contratado para o período.`);

  if (metrics.validationDeliverables) nextSteps.push(`Concluir a validação de ${metrics.validationDeliverables} entregável(eis) com o cliente.`);
  if (metrics.inProgressDeliverables) nextSteps.push(`Avançar ${metrics.inProgressDeliverables} entregável(eis) em execução.`);
  if (metrics.pendingDocuments) nextSteps.push(`Concluir o fluxo de ${metrics.pendingDocuments} documento(s) pendente(s).`);

  const facts = [
    `${metrics.approvedDeliverables} entregável(eis) aprovado(s)`,
    `${hoursLabel(metrics.hours)} de atuação`,
    `${metrics.meetings} reunião(ões)`,
    `${metrics.completedTasks} atividade(s) concluída(s)`,
  ];
  if (metrics.feedbackAverage !== null || metrics.feedbackResponses) facts.push(`feedback ${metrics.feedbackAverage === null ? 'sem média' : Number(metrics.feedbackAverage).toFixed(1).replace('.', ',')} em ${metrics.feedbackResponses} resposta(s)`);
  if (metrics.publishedDocuments) facts.push(`${metrics.publishedDocuments} documento(s) publicado(s)`);

  return {
    summary: `${snapshot.companyName} registrou ${facts.join(', ')} em ${periodLabel(type, snapshot.period.start)}.`,
    movements: movements.join('\n'),
    decisions: decisions.join('\n'),
    risks: risks.join('\n'),
    nextSteps: nextSteps.join('\n'),
  };
}
function sourceCount(snapshot: Snapshot) {
  return snapshot.hours.entriesCount + snapshot.events.count + snapshot.tasks.completedCount + snapshot.deliverables.approvedCount + snapshot.feedback.count + snapshot.documents.publishedCount + snapshot.conversations.commentCount;
}

function MetricRow({ label, automatic, value, onChange, step = '1' }: {
  label: string; automatic: string; value: number | null; onChange: (value: number | null) => void; step?: string;
}) {
  return <label className="reports-v8-metric-row">
    <span>{label}</span><strong>{automatic}</strong>
    <input type="number" min="0" step={step} value={value ?? ''} placeholder="Automático" onChange={(event) => onChange(numberOrNull(event.target.value))} />
  </label>;
}

function ReportPaper({ company, snapshot, editor, reportType, periodName, protocol, metrics }: {
  company: Company | null; snapshot: Snapshot; editor: ReportEditor; reportType: ReportType;
  periodName: string; protocol: string; metrics: MetricView;
}) {
  const profile = serviceProfile(snapshot);
  const sections = [
    { key: 'movements' as EditorKey, title: reportType === 'quarterly' ? 'Evolução e marcos do trimestre' : profile.movement },
    { key: 'decisions' as EditorKey, title: reportType === 'quarterly' ? 'Decisões estruturantes' : profile.decisions },
    { key: 'risks' as EditorKey, title: reportType === 'quarterly' ? 'Tendências e pontos de atenção' : 'Pontos que pedem atenção' },
    { key: 'nextSteps' as EditorKey, title: reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : profile.next },
  ].filter((section) => lines(editor[section.key]).length > 0);

  return <article className="reports-v8-paper">
    <span className="reports-v8-watermark oak" aria-hidden="true" />
    <span className="reports-v8-watermark lime" aria-hidden="true" />
    <header className="reports-v8-paper-header">
      <div className="reports-v8-wordmark"><strong>CALI</strong><span>RH PARA O NEGÓCIO</span></div>
      {company?.logoUrl ? <img src={company.logoUrl} alt={`Logo ${company.name}`} /> : <span className="reports-v8-company-fallback"><Building2 size={18} /></span>}
    </header>
    <section className="reports-v8-title">
      <span>{company?.name}</span>
      <h1>Relatório {reportTypeLabel[reportType]}</h1>
      <p>{periodName}</p>
      <small>{snapshot.contract.servicePlan || snapshot.contract.serviceType || 'CALI RH'} · Protocolo {protocol}</small>
    </section>
    <section className="reports-v8-paper-metrics" aria-label="Visão do período">
      <div><span>HORAS</span><strong>{hoursLabel(metrics.hours)}</strong><small>{metrics.contractedHours ? `de ${hoursLabel(metrics.contractedHours)} contratadas` : 'sem carga contratada'}</small></div>
      <div><span>REUNIÕES</span><strong>{metrics.meetings}</strong><small>{metrics.completedTasks} atividade(s) concluída(s)</small></div>
      <div><span>ENTREGÁVEIS</span><strong>{metrics.approvedDeliverables}</strong><small>{metrics.inProgressDeliverables} em andamento · {metrics.validationDeliverables} em validação</small></div>
      <div><span>NPS / FEEDBACK</span><strong>{metrics.feedbackAverage === null ? '—' : Number(metrics.feedbackAverage).toFixed(1).replace('.', ',')}</strong><small>{metrics.feedbackResponses} resposta(s)</small></div>
      <div><span>DOCUMENTOS</span><strong>{metrics.publishedDocuments}</strong><small>{metrics.pendingDocuments} pendente(s)</small></div>
    </section>
    <section className="reports-v8-paper-section lead"><span>SÍNTESE EXECUTIVA</span><p>{editor.summary || 'Síntese ainda não registrada.'}</p></section>
    {sections.map((section) => <section className={`reports-v8-paper-section ${section.key === 'risks' ? 'attention' : ''}`} key={section.key}><span>{section.title.toUpperCase()}</span><ul>{lines(editor[section.key]).map((item, index) => <li key={`${section.key}-${index}`}>{item}</li>)}</ul></section>)}
    <footer className="reports-v8-paper-footer">
      <div><i>Patrícia Lima</i><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div>
      <small>CALI RH · {protocol}</small>
    </footer>
  </article>;
}

export function AdminReportsPageV8() {
  const initial = monthlyPeriod();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [editor, setEditor] = useState<ReportEditor>(emptyEditor);
  const [manual, setManual] = useState<ManualMetrics>(emptyManual);
  const [manualDraft, setManualDraft] = useState<ManualMetrics>(emptyManual);
  const [supplementDraft, setSupplementDraft] = useState('');
  const [editing, setEditing] = useState<EditorKey | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === companyId) || null, [companies, companyId]);
  const companyReports = useMemo(() => reports.filter((item) => item.companyId === companyId), [reports, companyId]);
  const quarters = useMemo(() => quarterOptions(), []);
  const periodName = periodLabel(reportType, periodStart);
  const metrics = snapshot ? metricView(snapshot, manual) : null;
  const hasManual = Object.values(manual).some((value) => value !== null);
  const profile = snapshot ? serviceProfile(snapshot) : null;

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (companyId && periodStart && periodEnd) void loadPeriod(companyId, reportType, periodStart, periodEnd); }, [companyId, reportType, periodStart, periodEnd]);
  useEffect(() => {
    if (!previewOpen && !metricsOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [previewOpen, metricsOpen]);

  async function loadBase() {
    if (!supabase) return;
    setLoadingBase(true); setError('');
    try {
      const [companyResult, reportResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,monthly_hours_contracted,service_type,service_plan').neq('status', 'closed').order('display_name'),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at').neq('status', 'archived').order('period_start', { ascending: false }),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (reportResult.error) throw reportResult.error;
      const nextCompanies: Company[] = (companyResult.data || []).map((row) => ({ id: row.id, name: row.display_name, logoUrl: row.logo_url, monthlyHours: Number(row.monthly_hours_contracted || 0), serviceType: row.service_type, servicePlan: row.service_plan }));
      setCompanies(nextCompanies); setReports((reportResult.data || []).map(reportRow));
      if (!companyId && nextCompanies.length) setCompanyId(nextCompanies[0].id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar Relatórios.');
    } finally { setLoadingBase(false); }
  }

  async function loadPeriod(nextCompanyId: string, nextType: ReportType, nextStart: string, nextEnd: string) {
    if (!supabase) return;
    setLoadingPeriod(true); setError(''); setNotice(''); setEditing(null);
    try {
      const [snapshotResult, seriesResult, reportResult] = await Promise.all([
        supabase.rpc('build_report_source_snapshot', { p_company_id: nextCompanyId, p_period_start: nextStart, p_period_end: nextEnd }),
        supabase.rpc('build_report_monthly_series', { p_company_id: nextCompanyId, p_period_start: nextStart, p_period_end: nextEnd }),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at').eq('company_id', nextCompanyId).eq('report_type', nextType).eq('period_start', nextStart).eq('period_end', nextEnd).maybeSingle(),
      ]);
      if (snapshotResult.error) throw snapshotResult.error;
      if (seriesResult.error) throw seriesResult.error;
      if (reportResult.error) throw reportResult.error;
      const base = normalizeSnapshot(snapshotResult.data);
      if (!base) throw new Error('A base factual do período retornou em formato inválido.');
      const nextSnapshot = { ...base, monthlySeries: normalizeMonthlySeries(seriesResult.data) };
      setSnapshot(nextSnapshot);
      if (reportResult.data) {
        const report = reportRow(reportResult.data);
        const savedManual = report.sourceSnapshot?.manualOverrides ? { ...emptyManual, ...report.sourceSnapshot.manualOverrides } : emptyManual;
        setActiveReport(report); setManual(savedManual);
        setEditor({ summary: report.summary, movements: report.movements.join('\n'), decisions: report.decisions.join('\n'), risks: report.risks.join('\n'), nextSteps: report.nextSteps.join('\n') });
      } else {
        setActiveReport(null); setManual(emptyManual); setEditor(automaticReading(nextSnapshot, nextType, emptyManual));
      }
    } catch (requestError) {
      setSnapshot(null); setActiveReport(null); setEditor(emptyEditor); setManual(emptyManual);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o relatório do período.');
    } finally { setLoadingPeriod(false); }
  }

  function changeType(next: ReportType) {
    setReportType(next);
    const anchor = new Date(`${periodStart}T12:00:00`);
    const period = next === 'monthly' ? monthlyPeriod(anchor) : quarterlyPeriod(anchor);
    setPeriodStart(period.start); setPeriodEnd(period.end);
  }
  function changeMonth(value: string) {
    const [year, month] = value.split('-').map(Number);
    const period = monthlyPeriod(new Date(year, month - 1, 1)); setPeriodStart(period.start); setPeriodEnd(period.end);
  }
  function changeQuarter(value: string) { const period = quarterPeriod(value); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function regenerate() {
    if (!snapshot) return;
    if (activeReport && !window.confirm('Atualizar a leitura automática substitui os textos editados deste relatório. Deseja continuar?')) return;
    setEditor(automaticReading(snapshot, reportType, manual)); setNotice('Leitura atualizada com os registros atuais do Workspace.');
  }
  function openMetrics() { setManualDraft({ ...manual }); setSupplementDraft(editor.decisions); setMetricsOpen(true); }
  function applyMetrics() {
    if (!snapshot) return;
    setManual({ ...manualDraft });
    const next = automaticReading(snapshot, reportType, manualDraft);
    setEditor((current) => ({
      ...current,
      summary: activeReport ? current.summary : next.summary,
      movements: activeReport ? current.movements : next.movements,
      decisions: supplementDraft,
      risks: activeReport ? current.risks : next.risks,
      nextSteps: activeReport ? current.nextSteps : next.nextSteps,
    }));
    setMetricsOpen(false); setNotice('Complementos aplicados ao relatório.');
  }
  function printReport() {
    const original = document.title;
    document.title = `Relatório CALI RH - ${selectedCompany?.name || 'Cliente'} - ${periodName}`;
    window.print(); window.setTimeout(() => { document.title = original; }, 700);
  }

  async function persist(status: 'draft' | 'review' | 'published') {
    if (!supabase || !snapshot || !selectedCompany || !metrics) return;
    if (!editor.summary.trim()) { setError('Inclua a síntese executiva antes de salvar.'); return; }
    setSaving(true); setError('');
    const frozenSnapshot: Snapshot = { ...snapshot, manualOverrides: manual };
    const payload = {
      company_id: selectedCompany.id,
      title: `Relatório Executivo ${reportTypeLabel[reportType]} · ${selectedCompany.name} · ${periodName}`,
      report_type: reportType, period_start: periodStart, period_end: periodEnd,
      reference_month: `${periodStart.slice(0, 7)}-01`, status,
      executive_summary: editor.summary.trim(), movements: lines(editor.movements), decisions: lines(editor.decisions), risks: lines(editor.risks), next_steps: lines(editor.nextSteps),
      hours_summary: { contracted_hours: metrics.contractedHours, consumed_minutes: Math.round(metrics.hours * 60), consumed_percent: metrics.contractedHours ? metrics.hours / metrics.contractedHours * 100 : null, categories: snapshot.hours.categories },
      source_snapshot: frozenSnapshot,
      service_type_snapshot: snapshot.contract.serviceType || selectedCompany.serviceType || null,
      service_plan_snapshot: snapshot.contract.servicePlan || selectedCompany.servicePlan || null,
      contracted_hours_snapshot: metrics.contractedHours,
    };
    try {
      const result = activeReport
        ? await supabase.from('reports').update(payload).eq('id', activeReport.id).select('id').single()
        : await supabase.from('reports').insert(payload).select('id').single();
      if (result.error) throw result.error;
      await supabase.from('activity_log').insert({ company_id: selectedCompany.id, event_type: status === 'published' ? 'report_published' : status === 'review' ? 'report_review_saved' : 'report_draft_saved', entity_type: 'report', entity_id: result.data.id, metadata: { report_type: reportType, period_start: periodStart, period_end: periodEnd, manual_metrics: hasManual } });
      setNotice(status === 'published' ? 'Relatório publicado.' : status === 'review' ? 'Relatório salvo em revisão.' : 'Rascunho salvo.');
      await loadBase(); await loadPeriod(selectedCompany.id, reportType, periodStart, periodEnd);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o relatório.');
    } finally { setSaving(false); }
  }
  async function archive() {
    if (!supabase || !activeReport) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('reports').update({ status: 'archived' }).eq('id', activeReport.id);
    if (updateError) setError(updateError.message); else { setNotice('Relatório arquivado.'); setActiveReport(null); await loadBase(); }
    setSaving(false);
  }
  function openHistory(report: Report) { setCompanyId(report.companyId); setReportType(report.reportType); setPeriodStart(report.periodStart); setPeriodEnd(report.periodEnd); }

  if (loadingBase) return <Shell role="admin"><section className="page reports-admin-v8"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando Relatórios…</div></section></Shell>;

  return <Shell role="admin">
    <section className="page reports-admin-v8">
      <header className="reports-v8-header">
        <div><span className="eyebrow">LEITURA EXECUTIVA</span><h1>Relatórios</h1><p>O relatório já nasce com o que aconteceu no Workspace. Você entra para revisar, complementar exceções e publicar.</p></div>
        <div className="reports-v8-controls">
          <label><span>Cliente</span><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label><span>Tipo</span><select value={reportType} onChange={(event) => changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>
          {reportType === 'monthly' ? <label><span>Período</span><input type="month" value={periodStart.slice(0, 7)} onChange={(event) => changeMonth(event.target.value)} /></label> : <label><span>Período</span><select value={quarterKey(periodStart)} onChange={(event) => changeQuarter(event.target.value)}>{quarters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
        </div>
      </header>
      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice">{error}</div>}

      {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Montando o relatório de {periodName}…</div> : snapshot && metrics && <>
        <section className="reports-v8-actionbar">
          <div><Sparkles size={18} /><span><strong>Relatório montado pelo Workspace</strong><small>{sourceCount(snapshot)} registro(s) considerados · atualizado {formatDateTime(snapshot.generatedAt)}</small></span></div>
          <div><button className="secondary" type="button" onClick={openMetrics}><SlidersHorizontal size={15} />Complementar dados{hasManual ? ' · ativo' : ''}</button><button className="secondary" type="button" onClick={regenerate}><RefreshCw size={15} />Atualizar</button><button className="secondary" type="button" disabled={saving} onClick={() => void persist('draft')}><Save size={15} />Salvar rascunho</button><button className="primary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={15} />Prévia PDF</button></div>
        </section>

        <div className="reports-v8-layout">
          <main className="reports-v8-editor">
            <header className="reports-v8-editor-head">
              <div><span className="section-kicker">{activeReport?.protocol || 'NOVO RELATÓRIO'}</span><h2>{reportTypeLabel[reportType]} · {selectedCompany?.name}</h2><p>{periodName} · {snapshot.contract.servicePlan || snapshot.contract.serviceType || 'CALI RH'}</p></div>
              <span className={`report-status-v3 ${activeReport?.status || 'draft'}`}>{activeReport ? statusLabel[activeReport.status] : 'Não salvo'}</span>
            </header>

            <section className="reports-v8-metric-strip" aria-label="Visão do período">
              <div><span>Horas</span><strong>{hoursLabel(metrics.hours)}</strong><small>{metrics.contractedHours ? `de ${hoursLabel(metrics.contractedHours)}` : 'sem contrato informado'}</small></div>
              <div><span>Reuniões</span><strong>{metrics.meetings}</strong><small>{metrics.completedTasks} atividades</small></div>
              <div><span>Entregáveis</span><strong>{metrics.approvedDeliverables}</strong><small>{metrics.inProgressDeliverables} andamento · {metrics.validationDeliverables} validação</small></div>
              <div><span>NPS</span><strong>{metrics.feedbackAverage === null ? '—' : Number(metrics.feedbackAverage).toFixed(1).replace('.', ',')}</strong><small>{metrics.feedbackResponses} respostas</small></div>
              <div><span>Documentos</span><strong>{metrics.publishedDocuments}</strong><small>{metrics.pendingDocuments} pendentes</small></div>
            </section>

            {reportType === 'quarterly' && snapshot.monthlySeries.length > 0 && <section className="reports-v8-quarter-line"><span>Evolução do trimestre</span>{snapshot.monthlySeries.map((month) => <div key={month.monthRef}><strong>{monthShort(month.monthRef)}</strong><small>{hoursLabel(month.consumedMinutes / 60)} · {month.approvedCount} aprovado(s){month.feedbackAverage === null ? '' : ` · NPS ${month.feedbackAverage.toFixed(1).replace('.', ',')}`}</small></div>)}</section>}

            <section className="reports-v8-document-section lead">
              <div><span>SÍNTESE EXECUTIVA</span><h3>Leitura do período</h3></div>
              {editing === 'summary' ? <textarea autoFocus rows={6} value={editor.summary} onChange={(event) => setEditor((current) => ({ ...current, summary: event.target.value }))} /> : <p>{editor.summary || 'Clique em editar para registrar a síntese executiva.'}</p>}
              <button type="button" onClick={() => setEditing(editing === 'summary' ? null : 'summary')}><Pencil size={14} />{editing === 'summary' ? 'Concluir' : 'Editar'}</button>
            </section>

            <section className="reports-v8-document-section">
              <div><span>EXECUÇÃO</span><h3>{reportType === 'quarterly' ? 'Evolução e marcos do trimestre' : profile?.movement}</h3></div>
              {editing === 'movements' ? <textarea autoFocus rows={7} value={editor.movements} onChange={(event) => setEditor((current) => ({ ...current, movements: event.target.value }))} /> : lines(editor.movements).length ? <ul>{lines(editor.movements).map((item, index) => <li key={`movement-${index}`}>{item}</li>)}</ul> : <p className="reports-v8-empty-copy">Nenhum movimento relevante registrado no período.</p>}
              <button type="button" onClick={() => setEditing(editing === 'movements' ? null : 'movements')}><Pencil size={14} />{editing === 'movements' ? 'Concluir' : 'Editar'}</button>
            </section>

            {!!lines(editor.decisions).length && <section className="reports-v8-document-section compact">
              <div><span>ALINHAMENTOS</span><h3>{reportType === 'quarterly' ? 'Decisões estruturantes' : profile?.decisions}</h3></div>
              {editing === 'decisions' ? <textarea autoFocus rows={5} value={editor.decisions} onChange={(event) => setEditor((current) => ({ ...current, decisions: event.target.value }))} /> : <ul>{lines(editor.decisions).map((item, index) => <li key={`decision-${index}`}>{item}</li>)}</ul>}
              <button type="button" onClick={() => setEditing(editing === 'decisions' ? null : 'decisions')}><Pencil size={14} />{editing === 'decisions' ? 'Concluir' : 'Editar'}</button>
            </section>}

            {!!lines(editor.risks).length && <section className="reports-v8-document-section attention">
              <div><span>ATENÇÃO</span><h3>{reportType === 'quarterly' ? 'Tendências e pontos de atenção' : 'Pontos que pedem atenção'}</h3></div>
              {editing === 'risks' ? <textarea autoFocus rows={5} value={editor.risks} onChange={(event) => setEditor((current) => ({ ...current, risks: event.target.value }))} /> : <ul>{lines(editor.risks).map((item, index) => <li key={`risk-${index}`}>{item}</li>)}</ul>}
              <button type="button" onClick={() => setEditing(editing === 'risks' ? null : 'risks')}><Pencil size={14} />{editing === 'risks' ? 'Concluir' : 'Editar'}</button>
            </section>}

            <section className="reports-v8-document-section">
              <div><span>PRÓXIMO CICLO</span><h3>{reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : profile?.next}</h3></div>
              {editing === 'nextSteps' ? <textarea autoFocus rows={6} value={editor.nextSteps} onChange={(event) => setEditor((current) => ({ ...current, nextSteps: event.target.value }))} /> : lines(editor.nextSteps).length ? <ul>{lines(editor.nextSteps).map((item, index) => <li key={`next-${index}`}>{item}</li>)}</ul> : <p className="reports-v8-empty-copy">Sem pendências automáticas para o próximo ciclo.</p>}
              <button type="button" onClick={() => setEditing(editing === 'nextSteps' ? null : 'nextSteps')}><Pencil size={14} />{editing === 'nextSteps' ? 'Concluir' : 'Editar'}</button>
            </section>

            <footer className="reports-v8-origin"><ShieldCheck size={16} /><span><strong>Origem preservada</strong><small>Dados automáticos do Workspace e complementos manuais permanecem identificáveis no snapshot do relatório.</small></span></footer>
            <div className="reports-v8-workflow"><div>{activeReport && <button className="secondary danger-text" type="button" disabled={saving} onClick={() => void archive()}><Archive size={15} />Arquivar</button>}</div><div><button className="secondary" type="button" disabled={saving} onClick={() => void persist('review')}><BarChart3 size={15} />Em revisão</button><button className="primary" type="button" disabled={saving} onClick={() => void persist('published')}>{saving ? <Loader2 className="spin" size={15} /> : <Send size={15} />}Publicar</button></div></div>
          </main>

          <aside className="reports-v8-preview">
            <div className="reports-v8-preview-head"><div><FileText size={18} /><strong>Prévia A4</strong></div><button type="button" onClick={() => setPreviewOpen(true)}>Abrir PDF</button></div>
            <div className="reports-v8-mini-viewport"><div className="reports-v8-mini-scale"><ReportPaper company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol || 'gerado ao salvar'} metrics={metrics} /></div></div>
          </aside>
        </div>
      </>}

      <section className="reports-v8-history"><div><div><span className="section-kicker">HISTÓRICO</span><h2>Relatórios salvos</h2></div><span>{companyReports.length} registro(s)</span></div>{companyReports.length ? companyReports.map((report) => <button key={report.id} className={activeReport?.id === report.id ? 'active' : ''} type="button" onClick={() => openHistory(report)}><FileText size={17} /><span><small>{report.protocol} · {reportTypeLabel[report.reportType]}</small><strong>{report.title}</strong><em>{formatDate(report.periodStart)} → {formatDate(report.periodEnd)}</em></span><b className={`report-status-v3 ${report.status}`}>{statusLabel[report.status]}</b></button>) : <div className="panel report-history-empty-v3"><FileText size={24} /><div><strong>Nenhum relatório salvo para este cliente.</strong><span>A leitura automática acima já está pronta para revisão.</span></div></div>}</section>
    </section>

    {metricsOpen && snapshot && <div className="modal-backdrop workspace-modal-backdrop"><section className="modal-card reports-v8-metrics-modal" role="dialog" aria-modal="true" aria-label="Complementar dados do relatório"><button className="modal-close" type="button" onClick={() => setMetricsOpen(false)}><X size={20} /></button><header><span className="section-kicker">COMPLEMENTO MANUAL</span><h2>Dados do período</h2><p>Preencha apenas o que precisa substituir o Workspace. Campo vazio mantém o valor automático.</p></header><div className="reports-v8-metric-table"><div className="reports-v8-metric-table-head"><span>Indicador</span><span>Workspace</span><span>Ajuste</span></div><MetricRow label="Horas realizadas" automatic={hoursLabel(snapshot.hours.consumedMinutes / 60)} value={manualDraft.hours} step="0.25" onChange={(value) => setManualDraft((current) => ({ ...current, hours: value }))} /><MetricRow label="Reuniões / agenda" automatic={String(snapshot.events.count)} value={manualDraft.meetings} onChange={(value) => setManualDraft((current) => ({ ...current, meetings: value }))} /><MetricRow label="Atividades concluídas" automatic={String(snapshot.tasks.completedCount)} value={manualDraft.completedTasks} onChange={(value) => setManualDraft((current) => ({ ...current, completedTasks: value }))} /><MetricRow label="Entregáveis aprovados" automatic={String(snapshot.deliverables.approvedCount)} value={manualDraft.approvedDeliverables} onChange={(value) => setManualDraft((current) => ({ ...current, approvedDeliverables: value }))} /><MetricRow label="Entregáveis em andamento" automatic={String(snapshot.deliverables.inProgressCount)} value={manualDraft.inProgressDeliverables} onChange={(value) => setManualDraft((current) => ({ ...current, inProgressDeliverables: value }))} /><MetricRow label="NPS / feedback médio" automatic={snapshot.feedback.average === null ? '—' : Number(snapshot.feedback.average).toFixed(1).replace('.', ',')} value={manualDraft.feedbackAverage} step="0.1" onChange={(value) => setManualDraft((current) => ({ ...current, feedbackAverage: value }))} /><MetricRow label="Documentos publicados" automatic={String(snapshot.documents.publishedCount)} value={manualDraft.publishedDocuments} onChange={(value) => setManualDraft((current) => ({ ...current, publishedDocuments: value }))} /></div><details className="reports-v8-more-metrics"><summary>Mais indicadores</summary><div className="reports-v8-metric-table compact"><MetricRow label="Horas contratadas" automatic={hoursLabel(Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0))} value={manualDraft.contractedHours} step="0.25" onChange={(value) => setManualDraft((current) => ({ ...current, contractedHours: value }))} /><MetricRow label="Entregáveis em validação" automatic={String(snapshot.deliverables.clientReviewCount)} value={manualDraft.validationDeliverables} onChange={(value) => setManualDraft((current) => ({ ...current, validationDeliverables: value }))} /><MetricRow label="Respostas de feedback" automatic={String(snapshot.feedback.count)} value={manualDraft.feedbackResponses} onChange={(value) => setManualDraft((current) => ({ ...current, feedbackResponses: value }))} /><MetricRow label="Notas até 3" automatic={String(snapshot.feedback.lowScoreCount)} value={manualDraft.lowFeedbackCount} onChange={(value) => setManualDraft((current) => ({ ...current, lowFeedbackCount: value }))} /><MetricRow label="Documentos pendentes" automatic={String(snapshot.documents.awaitingFinalCount + snapshot.documents.readyToPublishCount)} value={manualDraft.pendingDocuments} onChange={(value) => setManualDraft((current) => ({ ...current, pendingDocuments: value }))} /></div></details><label className="reports-v8-supplement"><span>Adicionar algo que não está registrado no Workspace</span><textarea rows={4} value={supplementDraft} onChange={(event) => setSupplementDraft(event.target.value)} placeholder="Uma observação, decisão ou dependência por linha. Deixe em branco se não houver complemento." /></label><footer><button className="secondary" type="button" onClick={() => { setManualDraft(emptyManual); setSupplementDraft(''); }}>Limpar complementos</button><div><button className="secondary" type="button" onClick={() => setMetricsOpen(false)}>Cancelar</button><button className="primary" type="button" onClick={applyMetrics}>Aplicar no relatório</button></div></footer></section></div>}

    {previewOpen && snapshot && metrics && <div className="modal-backdrop workspace-modal-backdrop reports-v8-print-backdrop"><section className="modal-card reports-v8-preview-modal" role="dialog" aria-modal="true" aria-label="Prévia A4 do relatório"><div className="reports-v8-preview-toolbar"><div><strong>Prévia A4</strong><span>Versão final usada na impressão e no PDF.</span></div><div><button className="secondary" type="button" onClick={() => setPreviewOpen(false)}><X size={16} />Fechar</button><button className="primary" type="button" onClick={printReport}><Printer size={16} />Imprimir / Salvar PDF</button></div></div><div className="reports-v8-paper-full-wrap"><ReportPaper company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol || 'gerado ao salvar'} metrics={metrics} /></div></section></div>}
  </Shell>;
}
