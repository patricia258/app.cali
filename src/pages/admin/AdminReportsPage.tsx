import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, BarChart3, CalendarDays, CheckCircle2, ClipboardList,
  Clock3, FileCheck2, FileText, Loader2, MessageSquareText, RefreshCw, Save,
  ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type ReportStatus = 'draft' | 'review' | 'published' | 'archived';

type Company = {
  id: string;
  name: string;
  logoUrl?: string | null;
  monthlyHours: number;
  serviceType?: string | null;
  servicePlan?: string | null;
};

type ReportSnapshot = {
  generatedAt: string;
  companyId: string;
  companyName: string;
  monthRef: string;
  projects: Array<{ id: string; name: string; status: string; planningStatus: string }>;
  deliverables: {
    total: number;
    approvedCount: number;
    approvedTitles: string[];
    inProgressCount: number;
    inProgressTitles: string[];
    clientReviewCount: number;
    clientReviewTitles: string[];
    delayedCount: number;
    delayedTitles: string[];
    adjustmentCount: number;
    rebriefingCount: number;
  };
  hours: {
    contractedHours: number;
    consumedMinutes: number;
    consumedPercent: number | null;
    entriesCount: number;
    categories: Array<{ label: string; minutes: number }>;
  };
  nps: {
    count: number;
    average: number | null;
    lowScoreCount: number;
    comments: string[];
  };
  events: {
    count: number;
    titles: string[];
  };
  documents: {
    publishedCount: number;
    publishedTitles: string[];
    awaitingFinalCount: number;
    readyCount: number;
  };
};

type ReportRow = {
  id: string;
  companyId: string;
  title: string;
  referenceMonth: string;
  status: ReportStatus;
  executiveSummary: string;
  movements: string[];
  decisions: string[];
  risks: string[];
  nextSteps: string[];
  hoursSummary: Record<string, unknown>;
  sourceSnapshot: ReportSnapshot | null;
  protocol: string;
  publishedAt?: string | null;
  updatedAt: string;
};

type EditorState = {
  summary: string;
  movements: string;
  decisions: string;
  risks: string;
  nextSteps: string;
};

const emptyEditor: EditorState = { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' };

const statusLabel: Record<ReportStatus, string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
};

function currentMonthRef() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  const nextRef = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { startDate: `${ref}-01`, nextDate: nextRef };
}

function monthLabel(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

function linesToList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function listToLines(value: unknown) {
  return Array.isArray(value) ? value.map(String).join('\n') : '';
}

function normalizeSnapshot(value: unknown): ReportSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  return value as ReportSnapshot;
}

function buildBaseEditor(snapshot: ReportSnapshot): EditorState {
  const movements: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  snapshot.deliverables.approvedTitles.slice(0, 5).forEach((title) => movements.push(`Entregável aprovado: ${title}.`));
  snapshot.documents.publishedTitles.slice(0, 4).forEach((title) => movements.push(`Documento disponibilizado: ${title}.`));
  snapshot.events.titles.slice(0, 4).forEach((title) => movements.push(`Agenda do período: ${title}.`));
  if (!movements.length) snapshot.deliverables.inProgressTitles.slice(0, 4).forEach((title) => movements.push(`Execução em andamento: ${title}.`));

  snapshot.deliverables.delayedTitles.slice(0, 4).forEach((title) => risks.push(`Prazo impactado por dependência ou resposta do cliente: ${title}.`));
  if (snapshot.deliverables.rebriefingCount > 0) risks.push(`${snapshot.deliverables.rebriefingCount} entregável(eis) exigindo rebriefing.`);
  if (snapshot.hours.consumedPercent !== null && snapshot.hours.consumedPercent >= 80) risks.push(`Consumo de horas em ${Math.round(snapshot.hours.consumedPercent)}% da franquia mensal.`);
  if (snapshot.nps.lowScoreCount > 0) risks.push(`${snapshot.nps.lowScoreCount} avaliação(ões) com nota entre 1 e 3 exigem leitura qualitativa.`);

  snapshot.deliverables.clientReviewTitles.slice(0, 4).forEach((title) => nextSteps.push(`Concluir validação do cliente em ${title}.`));
  snapshot.deliverables.inProgressTitles.slice(0, 4).forEach((title) => nextSteps.push(`Avançar a execução de ${title}.`));
  if (snapshot.documents.awaitingFinalCount > 0) nextSteps.push(`Finalizar ${snapshot.documents.awaitingFinalCount} documento(s) aprovado(s) que aguardam arquivo final.`);
  if (snapshot.documents.readyCount > 0) nextSteps.push(`Revisar ${snapshot.documents.readyCount} documento(s) pronto(s) para publicação.`);

  const summaryParts = [
    `Em ${monthLabel(snapshot.monthRef)}, ${snapshot.companyName} registrou ${snapshot.deliverables.approvedCount} entregável(eis) aprovado(s)`,
    `${minutesLabel(snapshot.hours.consumedMinutes)} de atuação registrada`,
  ];
  if (snapshot.nps.count) summaryParts.push(`NPS médio ${snapshot.nps.average?.toFixed(1).replace('.', ',')} em ${snapshot.nps.count} avaliação(ões)`);
  if (snapshot.events.count) summaryParts.push(`${snapshot.events.count} compromisso(s) registrado(s) na agenda`);
  if (snapshot.documents.publishedCount) summaryParts.push(`${snapshot.documents.publishedCount} documento(s) disponibilizado(s)`);

  return {
    summary: `${summaryParts.join('; ')}. A leitura executiva abaixo deve ser revisada pela CALI antes de qualquer publicação.`,
    movements: movements.join('\n'),
    decisions: '',
    risks: risks.join('\n'),
    nextSteps: nextSteps.join('\n'),
  };
}

export function AdminReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [monthRef, setMonthRef] = useState(currentMonthRef());
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === companyId) || null, [companies, companyId]);
  const companyReports = useMemo(() => reports.filter((item) => !companyId || item.companyId === companyId), [reports, companyId]);

  useEffect(() => { void loadBaseData(); }, []);
  useEffect(() => {
    if (companyId && monthRef) void loadPeriod(companyId, monthRef);
  }, [companyId, monthRef]);

  async function loadBaseData() {
    if (!supabase) return;
    setLoadingBase(true);
    setError('');
    try {
      const [companyResult, reportResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,monthly_hours_contracted,service_type,service_plan').neq('status', 'closed').order('display_name'),
        supabase.from('reports').select('id,company_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,hours_summary,source_snapshot,protocol,published_at,updated_at').neq('status', 'archived').order('reference_month', { ascending: false }),
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
      const nextReports: ReportRow[] = (reportResult.data || []).map((row) => ({
        id: row.id,
        companyId: row.company_id,
        title: row.title,
        referenceMonth: String(row.reference_month).slice(0, 7),
        status: row.status as ReportStatus,
        executiveSummary: row.executive_summary || '',
        movements: Array.isArray(row.movements) ? row.movements.map(String) : [],
        decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
        risks: Array.isArray(row.risks) ? row.risks.map(String) : [],
        nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [],
        hoursSummary: (row.hours_summary || {}) as Record<string, unknown>,
        sourceSnapshot: normalizeSnapshot(row.source_snapshot),
        protocol: row.protocol || '—',
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
      }));
      setCompanies(nextCompanies);
      setReports(nextReports);
      if (!companyId && nextCompanies.length) setCompanyId(nextCompanies[0].id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar Relatórios.');
    } finally {
      setLoadingBase(false);
    }
  }

  async function loadPeriod(nextCompanyId: string, nextMonthRef: string) {
    if (!supabase) return;
    setLoadingPeriod(true);
    setError('');
    setNotice('');
    const { startDate, nextDate } = monthBounds(nextMonthRef);
    const selected = companies.find((item) => item.id === nextCompanyId);
    try {
      const [projectResult, deliverableResult, hoursResult, npsResult, eventsResult, filesResult, reportResult] = await Promise.all([
        supabase.from('projects').select('id,name,status,planning_status').eq('company_id', nextCompanyId).neq('status', 'closed'),
        supabase.from('deliverables').select('id,title,status,approved_at,due_at,client_delay_business_days,adjustment_count,rebriefing_required,updated_at').eq('company_id', nextCompanyId),
        supabase.from('hour_entries').select('minutes,category,work_date').eq('company_id', nextCompanyId).gte('work_date', startDate).lt('work_date', nextDate),
        supabase.from('nps_responses').select('score,comment,created_at').eq('company_id', nextCompanyId).gte('created_at', `${startDate}T00:00:00-03:00`).lt('created_at', `${nextDate}T00:00:00-03:00`),
        supabase.from('events').select('title,event_type,starts_at,cancelled_at').eq('company_id', nextCompanyId).gte('starts_at', `${startDate}T00:00:00-03:00`).lt('starts_at', `${nextDate}T00:00:00-03:00`).is('cancelled_at', null),
        supabase.from('files').select('title,status,workflow_stage,published_at,updated_at').eq('company_id', nextCompanyId),
        supabase.from('reports').select('id,company_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,hours_summary,source_snapshot,protocol,published_at,updated_at').eq('company_id', nextCompanyId).eq('reference_month', `${nextMonthRef}-01`).maybeSingle(),
      ]);
      const failure = [projectResult.error, deliverableResult.error, hoursResult.error, npsResult.error, eventsResult.error, filesResult.error, reportResult.error].find(Boolean);
      if (failure) throw failure;

      const deliverables = deliverableResult.data || [];
      const approvedInPeriod = deliverables.filter((item) => item.approved_at && String(item.approved_at) >= `${startDate}T00:00:00` && String(item.approved_at) < `${nextDate}T00:00:00`);
      const inProgress = deliverables.filter((item) => ['in_progress', 'internal_review'].includes(item.status));
      const clientReview = deliverables.filter((item) => item.status === 'client_review');
      const delayed = deliverables.filter((item) => Number(item.client_delay_business_days || 0) > 0);
      const hours = hoursResult.data || [];
      const consumedMinutes = hours.reduce((total, item) => total + Number(item.minutes || 0), 0);
      const categoryMap = new Map<string, number>();
      hours.forEach((item) => {
        const label = item.category || 'Sem categoria';
        categoryMap.set(label, (categoryMap.get(label) || 0) + Number(item.minutes || 0));
      });
      const nps = npsResult.data || [];
      const npsAverage = nps.length ? nps.reduce((sum, item) => sum + Number(item.score || 0), 0) / nps.length : null;
      const files = filesResult.data || [];
      const publishedDocuments = files.filter((item) => item.status === 'published' && item.published_at && String(item.published_at) >= `${startDate}T00:00:00` && String(item.published_at) < `${nextDate}T00:00:00`);
      const contractedHours = Number(selected?.monthlyHours || 0);
      const nextSnapshot: ReportSnapshot = {
        generatedAt: new Date().toISOString(),
        companyId: nextCompanyId,
        companyName: selected?.name || 'Cliente',
        monthRef: nextMonthRef,
        projects: (projectResult.data || []).map((item) => ({ id: item.id, name: item.name, status: item.status, planningStatus: item.planning_status })),
        deliverables: {
          total: deliverables.length,
          approvedCount: approvedInPeriod.length,
          approvedTitles: approvedInPeriod.map((item) => item.title),
          inProgressCount: inProgress.length,
          inProgressTitles: inProgress.map((item) => item.title),
          clientReviewCount: clientReview.length,
          clientReviewTitles: clientReview.map((item) => item.title),
          delayedCount: delayed.length,
          delayedTitles: delayed.map((item) => item.title),
          adjustmentCount: deliverables.reduce((sum, item) => sum + Number(item.adjustment_count || 0), 0),
          rebriefingCount: deliverables.filter((item) => Boolean(item.rebriefing_required)).length,
        },
        hours: {
          contractedHours,
          consumedMinutes,
          consumedPercent: contractedHours > 0 ? (consumedMinutes / 60 / contractedHours) * 100 : null,
          entriesCount: hours.length,
          categories: Array.from(categoryMap.entries()).map(([label, minutes]) => ({ label, minutes })).sort((a, b) => b.minutes - a.minutes),
        },
        nps: {
          count: nps.length,
          average: npsAverage,
          lowScoreCount: nps.filter((item) => Number(item.score) <= 3).length,
          comments: nps.map((item) => item.comment).filter(Boolean).map(String),
        },
        events: {
          count: (eventsResult.data || []).length,
          titles: (eventsResult.data || []).map((item) => item.title),
        },
        documents: {
          publishedCount: publishedDocuments.length,
          publishedTitles: publishedDocuments.map((item) => item.title),
          awaitingFinalCount: files.filter((item) => item.workflow_stage === 'awaiting_final_file').length,
          readyCount: files.filter((item) => item.workflow_stage === 'ready_to_publish').length,
        },
      };
      setSnapshot(nextSnapshot);

      const row = reportResult.data;
      if (row) {
        const nextReport: ReportRow = {
          id: row.id,
          companyId: row.company_id,
          title: row.title,
          referenceMonth: String(row.reference_month).slice(0, 7),
          status: row.status as ReportStatus,
          executiveSummary: row.executive_summary || '',
          movements: Array.isArray(row.movements) ? row.movements.map(String) : [],
          decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
          risks: Array.isArray(row.risks) ? row.risks.map(String) : [],
          nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [],
          hoursSummary: (row.hours_summary || {}) as Record<string, unknown>,
          sourceSnapshot: normalizeSnapshot(row.source_snapshot),
          protocol: row.protocol || '—',
          publishedAt: row.published_at,
          updatedAt: row.updated_at,
        };
        setActiveReport(nextReport);
        setEditor({
          summary: nextReport.executiveSummary,
          movements: listToLines(nextReport.movements),
          decisions: listToLines(nextReport.decisions),
          risks: listToLines(nextReport.risks),
          nextSteps: listToLines(nextReport.nextSteps),
        });
      } else {
        setActiveReport(null);
        setEditor(emptyEditor);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível ler os dados do período.');
      setSnapshot(null);
    } finally {
      setLoadingPeriod(false);
    }
  }

  function applyBaseReading() {
    if (!snapshot) return;
    setEditor(buildBaseEditor(snapshot));
    setNotice('Leitura-base montada a partir dos dados atuais. Revise o texto antes de salvar.');
  }

  async function saveReport(status: 'draft' | 'review') {
    if (!supabase || !snapshot || !selectedCompany) return;
    if (!editor.summary.trim()) {
      setError('Inclua a leitura executiva antes de salvar o relatório.');
      return;
    }
    setSaving(true);
    setError('');
    const title = `Relatório Executivo · ${selectedCompany.name} · ${monthLabel(monthRef)}`;
    const payload = {
      company_id: selectedCompany.id,
      title,
      reference_month: `${monthRef}-01`,
      status,
      executive_summary: editor.summary.trim(),
      movements: linesToList(editor.movements),
      decisions: linesToList(editor.decisions),
      risks: linesToList(editor.risks),
      next_steps: linesToList(editor.nextSteps),
      hours_summary: {
        contracted_hours: snapshot.hours.contractedHours,
        consumed_minutes: snapshot.hours.consumedMinutes,
        consumed_percent: snapshot.hours.consumedPercent,
        categories: snapshot.hours.categories,
      },
      source_snapshot: snapshot,
    };
    try {
      const result = activeReport
        ? await supabase.from('reports').update(payload).eq('id', activeReport.id).select('id,company_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,hours_summary,source_snapshot,protocol,published_at,updated_at').single()
        : await supabase.from('reports').insert(payload).select('id,company_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,hours_summary,source_snapshot,protocol,published_at,updated_at').single();
      if (result.error) throw result.error;
      setNotice(status === 'review' ? 'Relatório salvo e marcado como Em revisão.' : 'Rascunho salvo.');
      await loadBaseData();
      await loadPeriod(selectedCompany.id, monthRef);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o relatório.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveReport() {
    if (!supabase || !activeReport) return;
    setSaving(true);
    const { error: archiveError } = await supabase.from('reports').update({ status: 'archived' }).eq('id', activeReport.id);
    if (archiveError) setError(archiveError.message);
    else {
      setNotice('Relatório arquivado. O histórico permanece preservado.');
      setActiveReport(null);
      setEditor(emptyEditor);
      await loadBaseData();
    }
    setSaving(false);
  }

  function openHistoryReport(report: ReportRow) {
    setCompanyId(report.companyId);
    setMonthRef(report.referenceMonth);
  }

  if (loadingBase) {
    return <Shell role="admin"><section className="page reports-admin-v2"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando Relatórios…</div></section></Shell>;
  }

  return (
    <Shell role="admin">
      <section className="page reports-admin-v2">
        <div className="eyebrow">LEITURA EXECUTIVA</div>
        <div className="page-heading reports-heading-v2">
          <div>
            <h1>Relatórios</h1>
            <p>O Workspace organiza os fatos do mês. A CALI transforma esses registros em leitura executiva antes de qualquer publicação.</p>
          </div>
          <div className="reports-period-controls-v2">
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} aria-label="Cliente do relatório">
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <input type="month" value={monthRef} onChange={(event) => setMonthRef(event.target.value)} aria-label="Mês de referência" />
          </div>
        </div>

        {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
        {error && <div className="inline-notice">{error}</div>}

        {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Lendo fatos de {monthLabel(monthRef)}…</div> : snapshot && <>
          <section className="report-kpis-v2">
            <article><FileCheck2 size={19} /><div><strong>{snapshot.deliverables.approvedCount}</strong><span>Entregáveis aprovados</span><small>{snapshot.deliverables.inProgressCount} em andamento · {snapshot.deliverables.clientReviewCount} em validação</small></div></article>
            <article><Clock3 size={19} /><div><strong>{minutesLabel(snapshot.hours.consumedMinutes)}</strong><span>Horas registradas</span><small>{snapshot.hours.contractedHours ? `${Math.round(snapshot.hours.consumedPercent || 0)}% de ${snapshot.hours.contractedHours}h contratadas` : `${snapshot.hours.entriesCount} apontamento(s)`}</small></div></article>
            <article><MessageSquareText size={19} /><div><strong>{snapshot.nps.average === null ? '—' : snapshot.nps.average.toFixed(1).replace('.', ',')}</strong><span>NPS do período</span><small>{snapshot.nps.count} resposta(s) · {snapshot.nps.lowScoreCount} nota(s) até 3</small></div></article>
            <article><CalendarDays size={19} /><div><strong>{snapshot.events.count}</strong><span>Compromissos registrados</span><small>{snapshot.documents.publishedCount} documento(s) publicado(s)</small></div></article>
          </section>

          <div className="reports-workspace-v2">
            <aside className="report-sources-v2">
              <section className="panel report-source-panel-v2">
                <div className="report-source-heading-v2"><div><span className="section-kicker">FATOS DO PERÍODO</span><h2>Base da leitura</h2></div><button className="secondary" type="button" onClick={() => void loadPeriod(companyId, monthRef)}><RefreshCw size={15} />Atualizar</button></div>

                <div className="report-source-block-v2">
                  <div><ClipboardList size={17} /><strong>Execução</strong></div>
                  <p>{snapshot.deliverables.total} entregável(eis) vinculados · {snapshot.deliverables.adjustmentCount} ajuste(s) acumulado(s)</p>
                  {snapshot.deliverables.delayedCount > 0 && <span className="report-signal-warning-v2"><AlertTriangle size={14} />{snapshot.deliverables.delayedCount} com impacto de prazo</span>}
                </div>
                <div className="report-source-block-v2">
                  <div><Clock3 size={17} /><strong>Horas</strong></div>
                  <p>{minutesLabel(snapshot.hours.consumedMinutes)} no mês{snapshot.hours.contractedHours ? ` de ${snapshot.hours.contractedHours}h contratadas` : ''}.</p>
                  {snapshot.hours.categories.slice(0, 3).map((item) => <small key={item.label}>{item.label}: {minutesLabel(item.minutes)}</small>)}
                </div>
                <div className="report-source-block-v2">
                  <div><UsersRound size={17} /><strong>Feedback</strong></div>
                  <p>{snapshot.nps.count ? `${snapshot.nps.count} avaliação(ões), média ${snapshot.nps.average?.toFixed(1).replace('.', ',')}.` : 'Nenhuma avaliação registrada no mês.'}</p>
                  {snapshot.nps.comments.slice(0, 2).map((comment, index) => <small key={`${comment}-${index}`}>“{comment}”</small>)}
                </div>
                <div className="report-source-block-v2">
                  <div><FileText size={17} /><strong>Documentos</strong></div>
                  <p>{snapshot.documents.publishedCount} publicado(s) · {snapshot.documents.awaitingFinalCount} aguardando arquivo final · {snapshot.documents.readyCount} pronto(s) para publicar.</p>
                </div>
                <div className="report-source-block-v2">
                  <div><CalendarDays size={17} /><strong>Agenda</strong></div>
                  <p>{snapshot.events.count} compromisso(s) no período.</p>
                  {snapshot.events.titles.slice(0, 3).map((title) => <small key={title}>{title}</small>)}
                </div>

                <footer className="report-snapshot-foot-v2"><ShieldCheck size={14} /><span>Snapshot atual: {formatDateTime(snapshot.generatedAt)}</span></footer>
              </section>
            </aside>

            <section className="panel report-editor-v2">
              <header className="report-editor-header-v2">
                <div>
                  <span className="section-kicker">{activeReport ? activeReport.protocol : 'NOVO RELATÓRIO'}</span>
                  <h2>{selectedCompany?.name} · {monthLabel(monthRef)}</h2>
                  <p>{activeReport ? `Última atualização ${formatDateTime(activeReport.updatedAt)}` : 'Ainda não existe relatório salvo para este cliente e mês.'}</p>
                </div>
                <div className="report-editor-status-v2">
                  <span className={`report-status-v2 ${activeReport?.status || 'draft'}`}>{activeReport ? statusLabel[activeReport.status] : 'Não salvo'}</span>
                  <button className="secondary" type="button" onClick={applyBaseReading}><Sparkles size={15} />Montar leitura-base</button>
                </div>
              </header>

              <div className="report-editor-fields-v2">
                <label className="stacked-label report-summary-field-v2">Leitura executiva<textarea rows={6} value={editor.summary} onChange={(event) => setEditor((current) => ({ ...current, summary: event.target.value }))} placeholder="O que o decisor precisa compreender sobre o mês, além dos números?" /></label>
                <div className="report-editor-grid-v2">
                  <label className="stacked-label">Movimentos do período<textarea rows={7} value={editor.movements} onChange={(event) => setEditor((current) => ({ ...current, movements: event.target.value }))} placeholder={'Um movimento por linha\nEx.: Entregável X aprovado.'} /></label>
                  <label className="stacked-label">Decisões / definições<textarea rows={7} value={editor.decisions} onChange={(event) => setEditor((current) => ({ ...current, decisions: event.target.value }))} placeholder={'Uma decisão por linha\nRegistre somente decisões realmente tomadas.'} /></label>
                  <label className="stacked-label">Pontos de atenção<textarea rows={7} value={editor.risks} onChange={(event) => setEditor((current) => ({ ...current, risks: event.target.value }))} placeholder={'Um ponto por linha\nRiscos, dependências e alertas.'} /></label>
                  <label className="stacked-label">Próximos movimentos<textarea rows={7} value={editor.nextSteps} onChange={(event) => setEditor((current) => ({ ...current, nextSteps: event.target.value }))} placeholder={'Um próximo passo por linha\nO que precisa avançar no período seguinte.'} /></label>
                </div>
              </div>

              <footer className="report-editor-footer-v2">
                <div>
                  {activeReport?.sourceSnapshot?.generatedAt && <small>Snapshot salvo no relatório: {formatDateTime(activeReport.sourceSnapshot.generatedAt)}</small>}
                  <small>Publicação ao cliente será ativada na etapa de integração do painel do cliente.</small>
                </div>
                <div>
                  {activeReport && <button className="secondary danger-text" type="button" disabled={saving} onClick={() => void archiveReport()}><Archive size={15} />Arquivar</button>}
                  <button className="secondary" type="button" disabled={saving || !editor.summary.trim()} onClick={() => void saveReport('draft')}><Save size={15} />Salvar rascunho</button>
                  <button className="primary" type="button" disabled={saving || !editor.summary.trim()} onClick={() => void saveReport('review')}>{saving ? <Loader2 className="spin" size={16} /> : <BarChart3 size={16} />}Marcar em revisão</button>
                </div>
              </footer>
            </section>
          </div>
        </>}

        <section className="reports-history-v2">
          <div className="reports-history-heading-v2"><div><span className="section-kicker">HISTÓRICO</span><h2>Relatórios salvos</h2></div><span>{companyReports.length} registro(s)</span></div>
          {companyReports.length ? <div className="reports-history-list-v2">{companyReports.map((report) => <button key={report.id} type="button" className={activeReport?.id === report.id ? 'active' : ''} onClick={() => openHistoryReport(report)}><span className="report-history-icon-v2"><FileText size={18} /></span><span><small>{report.protocol}</small><strong>{report.title}</strong><em>Atualizado {formatDateTime(report.updatedAt)}</em></span><b className={`report-status-v2 ${report.status}`}>{statusLabel[report.status]}</b></button>)}</div> : <div className="panel report-history-empty-v2"><FileText size={25} /><div><strong>Nenhum relatório salvo para este cliente.</strong><span>Escolha o mês, monte a leitura-base e salve o primeiro rascunho.</span></div></div>}
        </section>
      </section>
    </Shell>
  );
}
