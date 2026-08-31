import { useEffect, useMemo, useState } from 'react';
import {
  Archive, BarChart3, Building2, CalendarDays, CheckCircle2, Clock3, Eye,
  FileCheck2, FileText, Loader2, MessageSquareText, Pencil, RefreshCw,
  Save, Send, ShieldCheck, Sparkles, TrendingUp, UsersRound, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import {
  normalizeMonthlySeries, reportTypeLabel,
  type MonthlySeriesPoint, type ReportEditor, type ReportType,
} from '../../lib/reportComposition';

type ReportStatus = 'draft' | 'review' | 'published' | 'archived';
type EditorKey = keyof ReportEditor;

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
const statusLabel: Record<ReportStatus, string> = { draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado' };

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

function monthShort(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  if (!year || !month) return ref;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '').replace(/^./, (char) => char.toUpperCase());
}

function minutesLabel(minutes: number) {
  const safe = Number(minutes || 0);
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
}

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
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

function consumedPercent(snapshot: Snapshot) {
  const contracted = Number(snapshot.hours.contractedHours || snapshot.contract.contractedHoursPeriod || 0);
  if (!contracted) return null;
  return (snapshot.hours.consumedMinutes / 60 / contracted) * 100;
}

function automaticReading(snapshot: Snapshot, type: ReportType): ReportEditor {
  const movements: string[] = [];
  const decisions: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  snapshot.deliverables.approved.slice(0, type === 'quarterly' ? 8 : 5).forEach((item) => movements.push(`Entregável aprovado: ${item.title}.`));
  snapshot.tasks.items.filter((item) => item.completedAt).slice(0, 5).forEach((item) => movements.push(`Atividade concluída: ${item.title}.`));
  snapshot.documents.published.slice(0, 4).forEach((item) => movements.push(`Documento publicado: ${item.title}.`));
  if (!movements.length) snapshot.events.items.slice(0, 4).forEach((item) => movements.push(`Agenda registrada: ${item.title}.`));

  snapshot.deliverables.statusChanges.filter((item) => item.note || item.to).slice(0, 6).forEach((item) => {
    decisions.push(item.note ? `${item.title}: ${item.note}` : `${item.title}: status alterado para ${item.to}.`);
  });
  if (!decisions.length && snapshot.conversations.comments.length) {
    snapshot.conversations.comments.filter((item) => item.clientVisible).slice(0, 4).forEach((item) => decisions.push(`Registro com o cliente: ${item.body}`));
  }

  if (snapshot.deliverables.delayedCount) risks.push(`${snapshot.deliverables.delayedCount} entregável(eis) tiveram impacto de prazo, somando ${snapshot.deliverables.delayBusinessDays} dia(s) útil(eis).`);
  if (snapshot.deliverables.adjustmentCount) risks.push(`${snapshot.deliverables.adjustmentCount} solicitação(ões) de ajuste foram registradas.`);
  if (snapshot.deliverables.rebriefingCount) risks.push(`${snapshot.deliverables.rebriefingCount} rebriefing(s) foram necessários no período.`);
  if (snapshot.feedback.lowScoreCount) risks.push(`${snapshot.feedback.lowScoreCount} avaliação(ões) entre 1 e 3 exigem atenção qualitativa.`);
  const usage = consumedPercent(snapshot);
  if (usage !== null && usage >= 80) risks.push(`O consumo de horas atingiu ${Math.round(usage)}% do contratado para o período.`);

  if (snapshot.deliverables.clientReviewCount) nextSteps.push(`Concluir a validação de ${snapshot.deliverables.clientReviewCount} entregável(eis) com o cliente.`);
  if (snapshot.deliverables.inProgressCount) nextSteps.push(`Avançar ${snapshot.deliverables.inProgressCount} entregável(eis) que permanecem em execução.`);
  if (snapshot.documents.awaitingFinalCount) nextSteps.push(`Finalizar ${snapshot.documents.awaitingFinalCount} documento(s) que aguardam arquivo final.`);
  if (snapshot.documents.readyToPublishCount) nextSteps.push(`Publicar ${snapshot.documents.readyToPublishCount} documento(s) já prontos.`);

  const facts = [
    `${snapshot.deliverables.approvedCount} entregável(eis) aprovado(s)`,
    `${minutesLabel(snapshot.hours.consumedMinutes)} de atuação registrada`,
    `${snapshot.events.count} reunião(ões)/agenda(s) registrada(s)`,
    `${snapshot.tasks.completedCount} atividade(s) concluída(s)`,
  ];
  if (snapshot.feedback.count) facts.push(`feedback médio ${Number(snapshot.feedback.average || 0).toFixed(1).replace('.', ',')} em ${snapshot.feedback.count} resposta(s)`);
  if (snapshot.documents.publishedCount) facts.push(`${snapshot.documents.publishedCount} documento(s) publicado(s)`);

  let summary = `${snapshot.companyName} registrou ${facts.join(', ')} em ${periodLabel(type, snapshot.period.start)}.`;
  if (type === 'quarterly' && snapshot.monthlySeries.length > 1) {
    summary += ` A evolução mês a mês foi considerada para consolidar a leitura do trimestre.`;
  }
  if (snapshot.deliverables.delayedCount || snapshot.deliverables.adjustmentCount || snapshot.feedback.lowScoreCount) {
    summary += ` O período também registrou pontos que exigem acompanhamento antes do próximo ciclo.`;
  }

  return {
    summary,
    movements: movements.length ? movements.join('\n') : 'Nenhuma entrega ou marco adicional foi registrado automaticamente no período.',
    decisions: decisions.length ? decisions.join('\n') : 'Nenhuma decisão formal foi identificada automaticamente nos registros do período.',
    risks: risks.length ? risks.join('\n') : 'Nenhum ponto crítico foi identificado automaticamente nos registros do período.',
    nextSteps: nextSteps.length ? nextSteps.join('\n') : 'Não há pendências automáticas identificadas para o próximo ciclo.',
  };
}

const sectionConfig: Record<EditorKey, { monthly: string; quarterly: string; icon: typeof FileText }> = {
  summary: { monthly: 'Síntese executiva', quarterly: 'Síntese executiva do trimestre', icon: FileText },
  movements: { monthly: 'Entregas e marcos do período', quarterly: 'Evolução e marcos do trimestre', icon: FileCheck2 },
  decisions: { monthly: 'Decisões e alinhamentos', quarterly: 'Decisões estruturantes', icon: UsersRound },
  risks: { monthly: 'Pontos de atenção', quarterly: 'Tendências e pontos de atenção', icon: MessageSquareText },
  nextSteps: { monthly: 'Próximo ciclo', quarterly: 'Prioridades do próximo trimestre', icon: CalendarDays },
};

export function AdminReportsPageV6() {
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
  const [editing, setEditing] = useState<EditorKey | null>(null);
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
  const usage = snapshot ? consumedPercent(snapshot) : null;

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => {
    if (companyId && periodStart && periodEnd) void loadPeriod(companyId, reportType, periodStart, periodEnd);
  }, [companyId, reportType, periodStart, periodEnd]);
  useEffect(() => {
    if (!previewOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [previewOpen]);

  async function loadBase() {
    if (!supabase) return;
    setLoadingBase(true);
    try {
      const [companyResult, reportResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,monthly_hours_contracted,service_type,service_plan').neq('status', 'closed').order('display_name'),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at').neq('status', 'archived').order('period_start', { ascending: false }),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (reportResult.error) throw reportResult.error;
      const nextCompanies = (companyResult.data || []).map((row) => ({
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
    setEditing(null);
    try {
      const [snapshotResult, seriesResult, reportResult] = await Promise.all([
        supabase.rpc('build_report_source_snapshot', { p_company_id: nextCompanyId, p_period_start: nextStart, p_period_end: nextEnd }),
        supabase.rpc('build_report_monthly_series', { p_company_id: nextCompanyId, p_period_start: nextStart, p_period_end: nextEnd }),
        supabase.from('reports').select('id,company_id,title,report_type,period_start,period_end,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,updated_at')
          .eq('company_id', nextCompanyId).eq('report_type', nextType).eq('period_start', nextStart).eq('period_end', nextEnd).maybeSingle(),
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
        setActiveReport(report);
        setEditor({
          summary: report.summary,
          movements: report.movements.join('\n'),
          decisions: report.decisions.join('\n'),
          risks: report.risks.join('\n'),
          nextSteps: report.nextSteps.join('\n'),
        });
      } else {
        setActiveReport(null);
        setEditor(automaticReading(nextSnapshot, nextType));
      }
    } catch (requestError) {
      setSnapshot(null);
      setActiveReport(null);
      setEditor(emptyEditor);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o relatório do período.');
    } finally {
      setLoadingPeriod(false);
    }
  }

  function changeType(next: ReportType) {
    setReportType(next);
    const anchor = new Date(`${periodStart}T12:00:00`);
    const period = next === 'monthly' ? monthlyPeriod(anchor) : quarterlyPeriod(anchor);
    setPeriodStart(period.start);
    setPeriodEnd(period.end);
  }

  function changeMonth(value: string) {
    const [year, month] = value.split('-').map(Number);
    const period = monthlyPeriod(new Date(year, month - 1, 1));
    setPeriodStart(period.start);
    setPeriodEnd(period.end);
  }

  function changeQuarter(value: string) {
    const period = quarterPeriod(value);
    setPeriodStart(period.start);
    setPeriodEnd(period.end);
  }

  function regenerate() {
    if (!snapshot) return;
    if (activeReport && !window.confirm('Atualizar a leitura automática substitui os textos editados deste relatório. Deseja continuar?')) return;
    setEditor(automaticReading(snapshot, reportType));
    setNotice('Leitura automática atualizada com os dados atuais do Workspace.');
  }

  async function persist(status: 'draft' | 'review' | 'published') {
    if (!supabase || !snapshot || !selectedCompany) return;
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
      movements: lines(editor.movements),
      decisions: lines(editor.decisions),
      risks: lines(editor.risks),
      next_steps: lines(editor.nextSteps),
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
      setNotice(status === 'published' ? 'Relatório publicado.' : status === 'review' ? 'Relatório salvo em revisão.' : 'Rascunho salvo.');
      await loadBase();
      await loadPeriod(selectedCompany.id, reportType, periodStart, periodEnd);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o relatório.');
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!supabase || !activeReport) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('reports').update({ status: 'archived' }).eq('id', activeReport.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice('Relatório arquivado.');
      setActiveReport(null);
      await loadBase();
    }
    setSaving(false);
  }

  function openHistory(report: Report) {
    setCompanyId(report.companyId);
    setReportType(report.reportType);
    setPeriodStart(report.periodStart);
    setPeriodEnd(report.periodEnd);
  }

  if (loadingBase) return <Shell role="admin"><section className="page reports-admin-v6"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando Relatórios…</div></section></Shell>;

  return <Shell role="admin">
    <section className="page reports-admin-v6">
      <header className="reports-v6-header">
        <div>
          <span className="eyebrow">LEITURA EXECUTIVA</span>
          <h1>Relatórios</h1>
          <p>O relatório nasce preenchido com tudo o que foi registrado no Workspace. Você revisa apenas o que precisar antes de salvar ou publicar.</p>
        </div>
        <div className="reports-v6-controls">
          <label><span>Cliente</span><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label><span>Tipo</span><select value={reportType} onChange={(event) => changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>
          {reportType === 'monthly'
            ? <label><span>Período</span><input type="month" value={periodStart.slice(0, 7)} onChange={(event) => changeMonth(event.target.value)} /></label>
            : <label><span>Período</span><select value={quarterKey(periodStart)} onChange={(event) => changeQuarter(event.target.value)}>{quarters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
        </div>
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice">{error}</div>}

      {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Montando o relatório de {periodName}…</div> : snapshot && <>
        <section className="reports-v6-actions">
          <div className="reports-v6-auto-copy"><Sparkles size={17} /><div><strong>Preenchimento automático ativo</strong><span>Projetos, entregáveis, horas, agenda, documentos, feedback e histórico do período já foram considerados.</span></div></div>
          <div>
            <button className="secondary" type="button" onClick={regenerate}><RefreshCw size={15} />Atualizar automático</button>
            <button className="secondary" type="button" disabled={saving} onClick={() => void persist('draft')}><Save size={15} />Salvar rascunho</button>
            <button className="primary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={15} />Prévia PDF</button>
          </div>
        </section>

        <section className="reports-v6-contract">
          <div><span>Serviço</span><strong>{snapshot.contract.serviceType || selectedCompany?.serviceType || 'Não definido'}</strong></div>
          <div><span>Plano</span><strong>{snapshot.contract.servicePlan || selectedCompany?.servicePlan || 'Sem pacote definido'}</strong></div>
          <div><span>Período</span><strong>{periodName}</strong></div>
          <div><span>Horas contratadas</span><strong>{Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0).toLocaleString('pt-BR')}h</strong></div>
        </section>

        <section className="reports-v6-kpis">
          <article><Clock3 /><span>Horas registradas</span><strong>{minutesLabel(snapshot.hours.consumedMinutes)}</strong><small>{usage === null ? `${snapshot.hours.entriesCount} apontamento(s)` : `${Math.round(usage)}% do contratado`}</small></article>
          <article><UsersRound /><span>Reuniões / agenda</span><strong>{snapshot.events.count}</strong><small>{snapshot.tasks.completedCount} atividade(s) concluída(s)</small></article>
          <article><FileCheck2 /><span>Entregáveis aprovados</span><strong>{snapshot.deliverables.approvedCount}</strong><small>{snapshot.deliverables.inProgressCount} em andamento · {snapshot.deliverables.clientReviewCount} em validação</small></article>
          <article><MessageSquareText /><span>NPS / feedback</span><strong>{snapshot.feedback.average === null ? '—' : Number(snapshot.feedback.average).toFixed(1).replace('.', ',')}</strong><small>{snapshot.feedback.count} resposta(s) · {snapshot.feedback.lowScoreCount} até nota 3</small></article>
          <article><FileText /><span>Documentos publicados</span><strong>{snapshot.documents.publishedCount}</strong><small>{snapshot.documents.awaitingFinalCount + snapshot.documents.readyToPublishCount} pendente(s)</small></article>
        </section>

        {reportType === 'quarterly' && snapshot.monthlySeries.length > 0 && <section className="reports-v6-quarter">
          <div><span className="section-kicker">EVOLUÇÃO DO TRIMESTRE</span><h2>Leitura mês a mês</h2></div>
          <div className="reports-v6-quarter-grid">{snapshot.monthlySeries.map((month) => <article key={month.monthRef}><strong>{monthShort(month.monthRef)}</strong><span>{minutesLabel(month.consumedMinutes)}</span><small>{month.approvedCount} aprovado(s) · {month.adjustmentEventsCount} ajuste(s)</small><em>{month.feedbackAverage === null ? 'Sem feedback' : `Feedback ${month.feedbackAverage.toFixed(1).replace('.', ',')}`}</em></article>)}</div>
        </section>}

        <div className="reports-v6-workspace">
          <main className="reports-v6-report">
            <div className="reports-v6-report-heading">
              <div><span className="section-kicker">{activeReport?.protocol || 'NOVO RELATÓRIO'}</span><h2>{reportTypeLabel[reportType]} · {selectedCompany?.name}</h2><p>{activeReport ? `Última atualização ${formatDateTime(activeReport.updatedAt)}` : 'Leitura montada automaticamente e ainda não salva.'}</p></div>
              <span className={`report-status-v3 ${activeReport?.status || 'draft'}`}>{activeReport ? statusLabel[activeReport.status] : 'Não salvo'}</span>
            </div>

            {(['summary', 'movements', 'decisions', 'risks', 'nextSteps'] as EditorKey[]).map((key, index) => {
              const config = sectionConfig[key];
              const Icon = config.icon;
              const title = reportType === 'monthly' ? config.monthly : config.quarterly;
              const value = editor[key];
              const listMode = key !== 'summary';
              return <section className="reports-v6-section" key={key}>
                <div className="reports-v6-section-label"><span className="reports-v6-section-icon"><Icon size={18} /></span><strong>{index + 1}. {title}</strong></div>
                <div className="reports-v6-section-body">
                  {editing === key
                    ? <textarea autoFocus rows={key === 'summary' ? 6 : 7} value={value} onChange={(event) => setEditor((current) => ({ ...current, [key]: event.target.value }))} />
                    : listMode
                      ? <ul>{lines(value).map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{item}</li>)}</ul>
                      : <p>{value}</p>}
                </div>
                <button className="reports-v6-edit" type="button" onClick={() => setEditing(editing === key ? null : key)} aria-label={`Editar ${title}`}><Pencil size={15} />{editing === key ? 'Concluir' : 'Editar'}</button>
              </section>;
            })}

            <footer className="reports-v6-origin"><ShieldCheck size={16} /><div><strong>Dados puxados automaticamente do Workspace</strong><span>Projetos, entregáveis, horas, agenda, aprovações, documentos, feedback, comentários e histórico de status.</span></div><small>Atualizado {formatDateTime(snapshot.generatedAt)}</small></footer>

            <div className="reports-v6-savebar">
              <div>{activeReport && <button className="secondary danger-text" type="button" disabled={saving} onClick={() => void archive()}><Archive size={15} />Arquivar</button>}</div>
              <div><button className="secondary" type="button" disabled={saving} onClick={() => void persist('draft')}><Save size={15} />Salvar rascunho</button><button className="secondary" type="button" disabled={saving} onClick={() => void persist('review')}><BarChart3 size={15} />Em revisão</button><button className="primary" type="button" disabled={saving} onClick={() => void persist('published')}>{saving ? <Loader2 className="spin" size={15} /> : <Send size={15} />}Publicar</button></div>
            </div>
          </main>

          <aside className="reports-v6-preview">
            <div className="reports-v6-preview-head"><div><FileText size={18} /><strong>Prévia do relatório</strong></div><button type="button" onClick={() => setPreviewOpen(true)}>Abrir maior</button></div>
            <div className="reports-v6-paper-mini">
              <header>
                <div className="reports-v6-brand"><span className="reports-v6-brand-mark">CALI</span><small>WORKSPACE</small></div>
                {selectedCompany?.logoUrl ? <img src={selectedCompany.logoUrl} alt={`Logo ${selectedCompany.name}`} /> : <span className="reports-v6-company-fallback"><Building2 size={18} /></span>}
              </header>
              <div className="reports-v6-cover-copy"><span>{selectedCompany?.name}</span><h3>Relatório {reportTypeLabel[reportType]}</h3><p>{periodName}</p><small>{activeReport?.protocol || 'Protocolo gerado ao salvar'}</small></div>
              <div className="reports-v6-preview-summary"><span>SÍNTESE EXECUTIVA</span><p>{editor.summary}</p></div>
              <div className="reports-v6-preview-signature"><i>Patrícia Lima</i><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div>
            </div>
          </aside>
        </div>
      </>}

      <section className="reports-v6-history">
        <div><div><span className="section-kicker">HISTÓRICO</span><h2>Relatórios salvos</h2></div><span>{companyReports.length} registro(s)</span></div>
        {companyReports.length ? companyReports.map((report) => <button key={report.id} className={activeReport?.id === report.id ? 'active' : ''} type="button" onClick={() => openHistory(report)}><FileText size={17} /><span><small>{report.protocol} · {reportTypeLabel[report.reportType]}</small><strong>{report.title}</strong><em>{formatDate(report.periodStart)} → {formatDate(report.periodEnd)}</em></span><b className={`report-status-v3 ${report.status}`}>{statusLabel[report.status]}</b></button>) : <div className="panel report-history-empty-v3"><FileText size={24} /><div><strong>Nenhum relatório salvo para este cliente.</strong><span>A leitura automática acima já está pronta para revisão.</span></div></div>}
      </section>
    </section>

    {previewOpen && snapshot && <div className="modal-backdrop workspace-modal-backdrop"><section className="modal-card reports-v6-preview-modal" role="dialog" aria-modal="true" aria-label="Prévia PDF"><button className="modal-close" type="button" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
      <div className="reports-v6-paper-full">
        <header><div className="reports-v6-brand"><span className="reports-v6-brand-mark">CALI</span><small>WORKSPACE</small></div>{selectedCompany?.logoUrl && <img src={selectedCompany.logoUrl} alt={`Logo ${selectedCompany.name}`} />}</header>
        <section className="reports-v6-full-title"><span>{selectedCompany?.name}</span><h1>Relatório {reportTypeLabel[reportType]}</h1><p>Período: {periodName}</p><small>Protocolo: {activeReport?.protocol || 'gerado ao salvar'}</small></section>
        <section><span className="section-kicker">SÍNTESE EXECUTIVA</span><p>{editor.summary}</p></section>
        {(['movements', 'decisions', 'risks', 'nextSteps'] as EditorKey[]).map((key) => {
          const config = sectionConfig[key];
          const title = reportType === 'monthly' ? config.monthly : config.quarterly;
          return <section key={key}><span className="section-kicker">{title.toUpperCase()}</span><ul>{lines(editor[key]).map((item, index) => <li key={`${key}-${index}`}>{item}</li>)}</ul></section>;
        })}
        <footer><div><i>Patrícia Lima</i><strong>Patrícia Lima</strong><span>People Advisory Executive · CALI RH</span></div><small>CALI RH · {activeReport?.protocol || 'Protocolo gerado ao salvar'}</small></footer>
      </div>
    </section></div>}
  </Shell>;
}
