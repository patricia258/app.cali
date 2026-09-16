import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, BarChart3, CalendarDays, CheckCircle2, ClipboardList,
  Clock3, Eye, FileCheck2, FileText, Loader2, MessageSquareText, RefreshCw,
  Save, Send, ShieldCheck, Sparkles, TrendingUp, UsersRound, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import {
  composeBaseReading, compositionGuide, editorLabels, normalizeMonthlySeries,
  planReadingMode, quarterlyEvolutionSummary, reportTypeLabel,
  type MonthlySeriesPoint, type ReportEditor, type ReportType,
} from '../../lib/reportComposition';

type ReportStatus = 'draft' | 'review' | 'published' | 'archived';

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
    startDate?: string | null;
    endDate?: string | null;
    autoRenew?: boolean | null;
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
};

type Report = {
  id: string;
  companyId: string;
  title: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  referenceMonth: string;
  status: ReportStatus;
  summary: string;
  movements: string[];
  decisions: string[];
  risks: string[];
  nextSteps: string[];
  sourceSnapshot: Snapshot | null;
  protocol: string;
  publishedAt?: string | null;
  updatedAt: string;
  serviceTypeSnapshot?: string | null;
  servicePlanSnapshot?: string | null;
  contractedHoursSnapshot?: number | null;
};

const emptyEditor: ReportEditor = { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' };
const statusLabel: Record<ReportStatus, string> = { draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado' };

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthlyPeriod(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: isoDate(start), end: isoDate(end) };
}

function quarterlyPeriod(date = new Date()) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  const start = new Date(date.getFullYear(), quarterStartMonth, 1);
  const end = new Date(date.getFullYear(), quarterStartMonth + 3, 0);
  return { start: isoDate(start), end: isoDate(end) };
}

function quarterKeyFromDate(value: string) {
  const [year, month] = value.split('-').map(Number);
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

function quarterPeriodFromKey(value: string) {
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

function periodLabel(type: ReportType, start: string) {
  const [year, month] = start.split('-').map(Number);
  if (type === 'monthly') return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  return `${Math.floor((month - 1) / 3) + 1}º trimestre de ${year}`;
}

function monthShortLabel(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  if (!year || !month) return ref;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '').replace(/^./, (char) => char.toUpperCase());
}

function minutesLabel(minutes: number) {
  const safe = Number(minutes || 0);
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

function linesToList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function listToLines(value: unknown) {
  return Array.isArray(value) ? value.map(String).join('\n') : '';
}

function normalizeSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as any;
  if (!raw.period || !raw.contract || !raw.deliverables || !raw.hours) return null;
  return { ...raw, monthlySeries: normalizeMonthlySeries(raw.monthlySeries) } as Snapshot;
}

function consumedPercent(snapshot: Snapshot) {
  const contracted = Number(snapshot.hours.contractedHours || snapshot.contract.contractedHoursPeriod || 0);
  if (!contracted) return null;
  return (Number(snapshot.hours.consumedMinutes || 0) / 60 / contracted) * 100;
}

function reportRow(row: any): Report {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    reportType: (row.report_type || 'monthly') as ReportType,
    periodStart: String(row.period_start || row.reference_month).slice(0, 10),
    periodEnd: String(row.period_end || row.reference_month).slice(0, 10),
    referenceMonth: String(row.reference_month).slice(0, 7),
    status: row.status as ReportStatus,
    summary: row.executive_summary || '',
    movements: Array.isArray(row.movements) ? row.movements.map(String) : [],
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
    risks: Array.isArray(row.risks) ? row.risks.map(String) : [],
    nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [],
    sourceSnapshot: normalizeSnapshot(row.source_snapshot),
    protocol: row.protocol || '—',
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    serviceTypeSnapshot: row.service_type_snapshot,
    servicePlanSnapshot: row.service_plan_snapshot,
    contractedHoursSnapshot: row.contracted_hours_snapshot === null ? null : Number(row.contracted_hours_snapshot),
  };
}

export function AdminReportsPageV5() {
  const initialPeriod = monthlyPeriod();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [periodStart, setPeriodStart] = useState(initialPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.end);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [editor, setEditor] = useState<ReportEditor>(emptyEditor);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === companyId) || null, [companies, companyId]);
  const companyReports = useMemo(() => reports.filter((item) => item.companyId === companyId), [reports, companyId]);
  const quarters = useMemo(() => quarterOptions(), []);
  const periodName = periodLabel(reportType, periodStart);
  const usagePercent = snapshot ? consumedPercent(snapshot) : null;
  const labels = editorLabels[reportType];
  const readingMode = planReadingMode(snapshot?.contract.servicePlan || selectedCompany?.servicePlan);
  const evolutionLines = snapshot ? quarterlyEvolutionSummary(snapshot.monthlySeries) : [];

  useEffect(() => { void loadBaseData(); }, []);
  useEffect(() => {
    if (companyId && periodStart && periodEnd) void loadPeriod(companyId, reportType, periodStart, periodEnd);
  }, [companyId, reportType, periodStart, periodEnd]);
  useEffect(() => {
    if (!previewOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [previewOpen]);

  async function loadBaseData() {
    if (!supabase) return;
    setLoadingBase(true);
    setError('');
    try {
      const [companyResult, reportResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,monthly_hours_contracted,service_type,service_plan').neq('status', 'closed').order('display_name'),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,published_at,updated_at,service_type_snapshot,service_plan_snapshot,contracted_hours_snapshot').neq('status', 'archived').order('period_start', { ascending: false }),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (reportResult.error) throw reportResult.error;
      const nextCompanies: Company[] = (companyResult.data || []).map((row) => ({
        id: row.id,
        name: row.display_name,
        logoUrl: row.logo_url,
        monthlyHours: Number(row.monthly_hours_contracted || 0),
        serviceType: row.service_type,
        servicePlan: row.service_plan,
      }));
      setCompanies(nextCompanies);
      setReports((reportResult.data || []).map(reportRow));
      if (!companyId && nextCompanies.length) setCompanyId(nextCompanies[0].id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar Relatórios.');
    } finally {
      setLoadingBase(false);
    }
  }

  async function loadPeriod(nextCompanyId: string, nextType: ReportType, nextStart: string, nextEnd: string) {
    if (!supabase) return;
    setLoadingPeriod(true);
    setError('');
    setNotice('');
    try {
      const [snapshotResult, seriesResult, reportResult] = await Promise.all([
        supabase.rpc('build_report_source_snapshot', { p_company_id: nextCompanyId, p_period_start: nextStart, p_period_end: nextEnd }),
        supabase.rpc('build_report_monthly_series', { p_company_id: nextCompanyId, p_period_start: nextStart, p_period_end: nextEnd }),
        supabase.from('reports')
          .select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,published_at,updated_at,service_type_snapshot,service_plan_snapshot,contracted_hours_snapshot')
          .eq('company_id', nextCompanyId)
          .eq('report_type', nextType)
          .eq('period_start', nextStart)
          .eq('period_end', nextEnd)
          .maybeSingle(),
      ]);
      if (snapshotResult.error) throw snapshotResult.error;
      if (seriesResult.error) throw seriesResult.error;
      if (reportResult.error) throw reportResult.error;
      const baseSnapshot = normalizeSnapshot(snapshotResult.data);
      if (!baseSnapshot) throw new Error('A base factual do período retornou em formato inválido.');
      const nextSnapshot: Snapshot = { ...baseSnapshot, monthlySeries: normalizeMonthlySeries(seriesResult.data) };
      setSnapshot(nextSnapshot);
      if (reportResult.data) {
        const report = reportRow(reportResult.data);
        setActiveReport(report);
        setEditor({
          summary: report.summary,
          movements: listToLines(report.movements),
          decisions: listToLines(report.decisions),
          risks: listToLines(report.risks),
          nextSteps: listToLines(report.nextSteps),
        });
      } else {
        setActiveReport(null);
        setEditor(emptyEditor);
      }
    } catch (requestError) {
      setSnapshot(null);
      setActiveReport(null);
      setEditor(emptyEditor);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível ler os fatos do período.');
    } finally {
      setLoadingPeriod(false);
    }
  }

  function changeReportType(nextType: ReportType) {
    setReportType(nextType);
    const anchor = new Date(`${periodStart}T12:00:00`);
    const nextPeriod = nextType === 'monthly' ? monthlyPeriod(anchor) : quarterlyPeriod(anchor);
    setPeriodStart(nextPeriod.start);
    setPeriodEnd(nextPeriod.end);
  }

  function changeMonth(value: string) {
    if (!value) return;
    const [year, month] = value.split('-').map(Number);
    const nextPeriod = monthlyPeriod(new Date(year, month - 1, 1));
    setPeriodStart(nextPeriod.start);
    setPeriodEnd(nextPeriod.end);
  }

  function changeQuarter(value: string) {
    const nextPeriod = quarterPeriodFromKey(value);
    setPeriodStart(nextPeriod.start);
    setPeriodEnd(nextPeriod.end);
  }

  function applyBaseReading() {
    if (!snapshot) return;
    setEditor(composeBaseReading(snapshot, reportType));
    setNotice(reportType === 'quarterly'
      ? 'Leitura trimestral montada com comparação mês a mês. Revise a interpretação antes de salvar.'
      : 'Leitura mensal montada a partir dos fatos registrados. Revise antes de salvar.');
  }

  async function persistReport(status: 'draft' | 'review' | 'published') {
    if (!supabase || !snapshot || !selectedCompany) return;
    if (!editor.summary.trim()) {
      setError('Inclua a leitura executiva antes de salvar.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      company_id: selectedCompany.id,
      title: `Relatório Executivo ${reportTypeLabel[reportType]} · ${selectedCompany.name} · ${periodName}`,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      reference_month: `${periodStart.slice(0, 7)}-01`,
      status,
      executive_summary: editor.summary.trim(),
      movements: linesToList(editor.movements),
      decisions: linesToList(editor.decisions),
      risks: linesToList(editor.risks),
      next_steps: linesToList(editor.nextSteps),
      hours_summary: {
        contracted_hours: snapshot.hours.contractedHours,
        consumed_minutes: snapshot.hours.consumedMinutes,
        consumed_percent: consumedPercent(snapshot),
        categories: snapshot.hours.categories,
      },
      source_snapshot: snapshot,
      service_type_snapshot: snapshot.contract.serviceType || selectedCompany.serviceType || null,
      service_plan_snapshot: snapshot.contract.servicePlan || selectedCompany.servicePlan || null,
      contracted_hours_snapshot: Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0),
    };
    try {
      const result = activeReport
        ? await supabase.from('reports').update(payload).eq('id', activeReport.id).select('id').single()
        : await supabase.from('reports').insert(payload).select('id').single();
      if (result.error) throw result.error;
      await supabase.from('activity_log').insert({
        company_id: selectedCompany.id,
        event_type: status === 'published' ? 'report_published' : status === 'review' ? 'report_review_saved' : 'report_draft_saved',
        entity_type: 'report',
        entity_id: result.data.id,
        metadata: { report_type: reportType, period_start: periodStart, period_end: periodEnd },
      });
      setNotice(status === 'published' ? 'Relatório publicado.' : status === 'review' ? 'Relatório salvo e marcado como Em revisão.' : 'Rascunho salvo.');
      await loadBaseData();
      await loadPeriod(selectedCompany.id, reportType, periodStart, periodEnd);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o relatório.');
    } finally {
      setSaving(false);
    }
  }

  async function unpublishReport() {
    if (!supabase || !activeReport) return;
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.from('reports').update({ status: 'review' }).eq('id', activeReport.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({
        company_id: activeReport.companyId,
        event_type: 'report_unpublished', entity_type: 'report', entity_id: activeReport.id,
        metadata: { report_type: activeReport.reportType, period_start: activeReport.periodStart, period_end: activeReport.periodEnd },
      });
      setNotice('Publicação retirada. O relatório voltou para Em revisão.');
      await loadBaseData();
      await loadPeriod(activeReport.companyId, activeReport.reportType, activeReport.periodStart, activeReport.periodEnd);
    }
    setSaving(false);
  }

  async function archiveReport() {
    if (!supabase || !activeReport) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('reports').update({ status: 'archived' }).eq('id', activeReport.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({
        company_id: activeReport.companyId,
        event_type: 'report_archived', entity_type: 'report', entity_id: activeReport.id,
        metadata: { report_type: activeReport.reportType, period_start: activeReport.periodStart, period_end: activeReport.periodEnd },
      });
      setNotice('Relatório arquivado. O histórico do banco foi preservado.');
      setActiveReport(null);
      setEditor(emptyEditor);
      await loadBaseData();
    }
    setSaving(false);
  }

  function openHistory(report: Report) {
    setCompanyId(report.companyId);
    setReportType(report.reportType);
    setPeriodStart(report.periodStart);
    setPeriodEnd(report.periodEnd);
  }

  if (loadingBase) {
    return <Shell role="admin"><section className="page reports-admin-v3 reports-admin-v4 reports-admin-v5"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando Relatórios…</div></section></Shell>;
  }

  return <Shell role="admin">
    <section className="page reports-admin-v3 reports-admin-v4 reports-admin-v5">
      <div className="eyebrow">LEITURA EXECUTIVA</div>
      <div className="page-heading reports-heading-v3 reports-heading-v4">
        <div>
          <h1>Relatórios</h1>
          <p>O Workspace reúne automaticamente os fatos do período. O mensal acompanha execução; o trimestral evidencia evolução, recorrências e mudança de ritmo.</p>
        </div>
        <div className="reports-period-controls-v3 reports-period-controls-v4">
          <label><span>Cliente</span><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label><span>Tipo</span><select value={reportType} onChange={(event) => changeReportType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>
          {reportType === 'monthly'
            ? <label><span>Período</span><input type="month" value={periodStart.slice(0, 7)} onChange={(event) => changeMonth(event.target.value)} /></label>
            : <label><span>Período</span><select value={quarterKeyFromDate(periodStart)} onChange={(event) => changeQuarter(event.target.value)}>{quarters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
        </div>
      </div>

      {snapshot && <>
        <section className="report-contract-strip-v4" aria-label="Base contratual do relatório">
          <div><span>Serviço</span><strong>{snapshot.contract.serviceType || selectedCompany?.serviceType || 'Não definido'}</strong></div>
          <div><span>Plano</span><strong>{snapshot.contract.servicePlan || selectedCompany?.servicePlan || 'Sem pacote definido'}</strong></div>
          <div><span>Período apurado</span><strong>{formatDate(periodStart)} → {formatDate(periodEnd)}</strong></div>
          <div><span>Horas contratadas</span><strong>{Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0).toLocaleString('pt-BR')}h</strong></div>
        </section>
        <section className={`report-composition-guide-v5 ${readingMode.key}`}>
          <div className="report-mode-copy-v5"><span>{readingMode.title}</span><p>{readingMode.description}</p></div>
          <div className="report-guide-items-v5">{compositionGuide[reportType].map((item, index) => <article key={item.title}><b>0{index + 1}</b><div><strong>{item.title}</strong><small>{item.description}</small></div></article>)}</div>
        </section>
      </>}

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice">{error}</div>}

      {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Lendo fatos de {periodName}…</div> : snapshot && <>
        <section className="report-kpis-v3">
          <article><FileCheck2 size={19} /><div><strong>{snapshot.deliverables.approvedCount}</strong><span>Entregáveis aprovados</span><small>{snapshot.deliverables.inProgressCount} em andamento · {snapshot.deliverables.clientReviewCount} em validação</small></div></article>
          <article><Clock3 size={19} /><div><strong>{minutesLabel(snapshot.hours.consumedMinutes)}</strong><span>Horas registradas</span><small>{snapshot.hours.contractedHours ? `${Math.round(usagePercent || 0)}% de ${snapshot.hours.contractedHours}h contratadas` : `${snapshot.hours.entriesCount} apontamento(s)`}</small></div></article>
          <article><MessageSquareText size={19} /><div><strong>{snapshot.feedback.average === null ? '—' : Number(snapshot.feedback.average).toFixed(1).replace('.', ',')}</strong><span>Feedback do período</span><small>{snapshot.feedback.count} resposta(s) · {snapshot.feedback.lowScoreCount} nota(s) até 3</small></div></article>
          <article><FileText size={19} /><div><strong>{snapshot.documents.publishedCount}</strong><span>Documentos publicados</span><small>{snapshot.documents.awaitingFinalCount} aguardando arquivo · {snapshot.documents.readyToPublishCount} prontos</small></div></article>
        </section>

        {reportType === 'quarterly' && <section className="panel quarterly-evolution-v5">
          <header><div><span className="section-kicker">EVOLUÇÃO DO TRIMESTRE</span><h2>Como a conta se moveu mês a mês</h2><p>A leitura compara fatos equivalentes em cada mês. Ela não transforma ausência de dado em conclusão.</p></div><TrendingUp size={22} /></header>
          <div className="quarterly-month-grid-v5">
            {snapshot.monthlySeries.map((month) => <article key={month.monthRef}>
              <div className="quarter-month-title-v5"><span>{monthShortLabel(month.monthRef)}</span><small>{formatDate(month.start)} → {formatDate(month.end)}</small></div>
              <dl>
                <div><dt>Horas</dt><dd>{minutesLabel(month.consumedMinutes)}</dd></div>
                <div><dt>Aprovados</dt><dd>{month.approvedCount}</dd></div>
                <div><dt>Feedback</dt><dd>{month.feedbackAverage === null ? '—' : month.feedbackAverage.toFixed(1).replace('.', ',')}</dd></div>
                <div><dt>Ajustes</dt><dd>{month.adjustmentEventsCount}</dd></div>
              </dl>
              <footer>{month.completedTasksCount} atividade(s) · {month.publishedDocumentsCount} documento(s) · {month.eventsCount} agenda(s)</footer>
            </article>)}
          </div>
          {evolutionLines.length > 0 && <div className="quarterly-reading-strip-v5">{evolutionLines.map((line) => <span key={line}>{line}</span>)}</div>}
        </section>}

        <div className="reports-workspace-v3">
          <aside className="report-sources-v3">
            <section className="panel report-source-panel-v3">
              <header><div><span className="section-kicker">FATOS DO PERÍODO</span><h2>Base da leitura</h2></div><button className="secondary" type="button" onClick={() => void loadPeriod(companyId, reportType, periodStart, periodEnd)}><RefreshCw size={15} />Atualizar</button></header>
              <div className="report-source-block-v3"><div><ClipboardList size={17} /><strong>Execução</strong></div><p>{snapshot.deliverables.approvedCount} aprovado(s) · {snapshot.deliverables.inProgressCount} em andamento · {snapshot.deliverables.adjustmentCount} ajuste(s)</p>{snapshot.deliverables.delayedCount > 0 && <span className="report-signal-warning-v3"><AlertTriangle size={14} />{snapshot.deliverables.delayedCount} com impacto de prazo</span>}</div>
              <div className="report-source-block-v3"><div><Clock3 size={17} /><strong>Horas</strong></div><p>{minutesLabel(snapshot.hours.consumedMinutes)} no período{snapshot.hours.contractedHours ? ` de ${snapshot.hours.contractedHours}h contratadas` : ''}.</p>{snapshot.hours.categories.slice(0, 3).map((item) => <small key={item.label}>{item.label}: {minutesLabel(item.minutes)}</small>)}</div>
              <div className="report-source-block-v3"><div><UsersRound size={17} /><strong>Feedback</strong></div><p>{snapshot.feedback.count ? `${snapshot.feedback.count} avaliação(ões), média ${Number(snapshot.feedback.average || 0).toFixed(1).replace('.', ',')}.` : 'Nenhuma avaliação registrada no período.'}</p>{snapshot.feedback.responses.map((item) => item.comment).filter(Boolean).slice(0, 2).map((comment, index) => <small key={`${comment}-${index}`}>“{comment}”</small>)}</div>
              <div className="report-source-block-v3"><div><CalendarDays size={17} /><strong>Agenda e atividade</strong></div><p>{snapshot.events.count} compromisso(s) · {snapshot.tasks.completedCount} atividade(s) concluída(s).</p>{snapshot.events.items.slice(0, 2).map((item) => <small key={item.id}>{item.title}</small>)}</div>
              <div className="report-source-block-v3"><div><MessageSquareText size={17} /><strong>Conversa e registro</strong></div><p>{snapshot.conversations.commentCount} comentário(s) · {snapshot.deliverables.statusChanges.length} mudança(s) de status.</p></div>
              <footer><ShieldCheck size={14} /><span>Snapshot atual: {formatDateTime(snapshot.generatedAt)}</span></footer>
            </section>
          </aside>

          <section className="panel report-editor-v3">
            <header className="report-editor-header-v3">
              <div><span className="section-kicker">{activeReport?.protocol || 'NOVO RELATÓRIO'}</span><h2>{selectedCompany?.name} · {periodName}</h2><p>{activeReport ? `Atualizado ${formatDateTime(activeReport.updatedAt)}` : `Ainda não existe relatório ${reportTypeLabel[reportType].toLowerCase()} salvo para este período.`}</p></div>
              <div><span className={`report-status-v3 ${activeReport?.status || 'draft'}`}>{activeReport ? statusLabel[activeReport.status] : 'Não salvo'}</span><button className="secondary" type="button" onClick={applyBaseReading}><Sparkles size={15} />Montar leitura-base</button></div>
            </header>
            <div className="report-editor-fields-v3">
              <label className="stacked-label report-summary-field-v3">{labels.summary}<textarea rows={5} value={editor.summary} onChange={(event) => setEditor((current) => ({ ...current, summary: event.target.value }))} placeholder={labels.summaryPlaceholder} /></label>
              <div className="report-editor-grid-v3">
                <label className="stacked-label">{labels.movements}<textarea rows={6} value={editor.movements} onChange={(event) => setEditor((current) => ({ ...current, movements: event.target.value }))} placeholder={labels.movementsPlaceholder} /></label>
                <label className="stacked-label">{labels.decisions}<textarea rows={6} value={editor.decisions} onChange={(event) => setEditor((current) => ({ ...current, decisions: event.target.value }))} placeholder={labels.decisionsPlaceholder} /></label>
                <label className="stacked-label">{labels.risks}<textarea rows={6} value={editor.risks} onChange={(event) => setEditor((current) => ({ ...current, risks: event.target.value }))} placeholder={labels.risksPlaceholder} /></label>
                <label className="stacked-label">{labels.nextSteps}<textarea rows={6} value={editor.nextSteps} onChange={(event) => setEditor((current) => ({ ...current, nextSteps: event.target.value }))} placeholder={labels.nextStepsPlaceholder} /></label>
              </div>
            </div>
            <footer className="report-editor-footer-v3">
              <div><small>{activeReport?.sourceSnapshot?.generatedAt ? `Snapshot salvo: ${formatDateTime(activeReport.sourceSnapshot.generatedAt)}` : 'Ao salvar, os fatos, a série mensal e a fotografia contratual ficam congelados junto ao relatório.'}</small><small>Publicação para o cliente será validada quando entrarmos na área do cliente.</small></div>
              <div>
                {activeReport && <button className="secondary danger-text" type="button" disabled={saving} onClick={() => void archiveReport()}><Archive size={15} />Arquivar</button>}
                <button className="secondary" type="button" disabled={saving || !editor.summary.trim()} onClick={() => setPreviewOpen(true)}><Eye size={15} />Prévia</button>
                <button className="secondary" type="button" disabled={saving || !editor.summary.trim()} onClick={() => void persistReport('draft')}><Save size={15} />Salvar rascunho</button>
                {activeReport?.status === 'published' ? <button className="secondary" type="button" disabled={saving} onClick={() => void unpublishReport()}><RefreshCw size={15} />Retirar publicação</button> : <button className="secondary" type="button" disabled={saving || !editor.summary.trim()} onClick={() => void persistReport('review')}><BarChart3 size={15} />Em revisão</button>}
                {activeReport?.status !== 'published' && <button className="primary" type="button" disabled={saving || !editor.summary.trim()} onClick={() => void persistReport('published')}>{saving ? <Loader2 className="spin" size={16} /> : <Send size={16} />}Publicar</button>}
              </div>
            </footer>
          </section>
        </div>
      </>}

      <section className="reports-history-v3">
        <div><div><span className="section-kicker">HISTÓRICO</span><h2>Relatórios salvos</h2></div><span>{companyReports.length} registro(s)</span></div>
        {companyReports.length ? <div className="reports-history-list-v3">{companyReports.map((report) => <button key={report.id} type="button" className={activeReport?.id === report.id ? 'active' : ''} onClick={() => openHistory(report)}><span className="report-history-icon-v3"><FileText size={18} /></span><span><small>{report.protocol} · {reportTypeLabel[report.reportType]}</small><strong>{report.title}</strong><em>{formatDate(report.periodStart)} → {formatDate(report.periodEnd)} · atualizado {formatDateTime(report.updatedAt)}</em></span><b className={`report-status-v3 ${report.status}`}>{statusLabel[report.status]}</b></button>)}</div> : <div className="panel report-history-empty-v3"><FileText size={25} /><div><strong>Nenhum relatório salvo para este cliente.</strong><span>Escolha o tipo e o período, monte a leitura-base e salve o primeiro rascunho.</span></div></div>}
      </section>
    </section>

    {previewOpen && <div className="modal-backdrop workspace-modal-backdrop" role="presentation"><section className="modal-card report-preview-modal-v3" role="dialog" aria-modal="true" aria-label="Prévia do relatório"><button className="modal-close" type="button" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
      <div className="report-preview-paper-v3 report-preview-paper-v5">
        <header><div><span>CALI RH · RELATÓRIO EXECUTIVO {reportTypeLabel[reportType].toUpperCase()}</span><strong>{selectedCompany?.name}</strong><small>{snapshot?.contract.serviceType || selectedCompany?.serviceType || 'Serviço CALI'}{snapshot?.contract.servicePlan ? ` · ${snapshot.contract.servicePlan}` : ''}</small></div><span>{periodName}<br />{formatDate(periodStart)} → {formatDate(periodEnd)}</span></header>
        <section className="report-preview-lead-v3"><span className="section-kicker">LEITURA EXECUTIVA</span><h2>{reportType === 'quarterly' ? 'Como a conta evoluiu no trimestre' : 'O que este mês colocou em movimento'}</h2><p>{editor.summary}</p></section>
        {reportType === 'quarterly' && snapshot && <section className="preview-quarterly-series-v5"><span className="section-kicker">EVOLUÇÃO MÊS A MÊS</span><div>{snapshot.monthlySeries.map((month) => <article key={month.monthRef}><strong>{monthShortLabel(month.monthRef)}</strong><span>{minutesLabel(month.consumedMinutes)} · {month.approvedCount} aprovado(s)</span><small>{month.feedbackAverage === null ? 'Sem feedback' : `Feedback ${month.feedbackAverage.toFixed(1).replace('.', ',')}`} · {month.adjustmentEventsCount} ajuste(s)</small></article>)}</div></section>}
        {linesToList(editor.movements).length > 0 && <section><span className="section-kicker">{reportType === 'quarterly' ? 'EVOLUÇÃO E MARCOS' : 'ENTREGAS E MOVIMENTOS'}</span><ul>{linesToList(editor.movements).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        {linesToList(editor.decisions).length > 0 && <section><span className="section-kicker">{reportType === 'quarterly' ? 'DECISÕES ESTRUTURANTES' : 'DECISÕES E ALINHAMENTOS'}</span><ul>{linesToList(editor.decisions).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        {linesToList(editor.risks).length > 0 && <section className="attention"><span className="section-kicker">{reportType === 'quarterly' ? 'TENDÊNCIAS E PONTOS DE ATENÇÃO' : 'PONTOS DE ATENÇÃO'}</span><ul>{linesToList(editor.risks).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        {linesToList(editor.nextSteps).length > 0 && <section><span className="section-kicker">{reportType === 'quarterly' ? 'PRIORIDADES DO PRÓXIMO TRIMESTRE' : 'PRÓXIMO CICLO'}</span><ul>{linesToList(editor.nextSteps).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        <footer><span>{activeReport?.protocol || 'Protocolo gerado ao salvar'}</span><span>Patrícia Lima · CALI RH</span></footer>
      </div>
    </section></div>}
  </Shell>;
}
