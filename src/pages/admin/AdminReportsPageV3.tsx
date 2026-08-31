import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, BarChart3, CalendarDays, CheckCircle2, ClipboardList,
  Clock3, Eye, FileCheck2, FileText, Loader2, MessageSquareText, RefreshCw,
  Save, Send, ShieldCheck, Sparkles, UsersRound, X,
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

type Snapshot = {
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
  feedback: {
    count: number;
    average: number | null;
    lowScoreCount: number;
    comments: string[];
  };
  events: { count: number; titles: string[] };
  documents: {
    publishedCount: number;
    publishedTitles: string[];
    awaitingFinalCount: number;
    readyCount: number;
  };
};

type Report = {
  id: string;
  companyId: string;
  title: string;
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
};

type Editor = {
  summary: string;
  movements: string;
  decisions: string;
  risks: string;
  nextSteps: string;
};

const emptyEditor: Editor = { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' };
const statusLabel: Record<ReportStatus, string> = { draft: 'Rascunho', review: 'Em revisão', published: 'Publicado', archived: 'Arquivado' };

function currentMonthRef() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return { start: `${ref}-01`, next: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01` };
}

function monthLabel(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
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

function normalizeSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as any;
  if (raw.feedback) return raw as Snapshot;
  if (raw.nps) return { ...raw, feedback: raw.nps } as Snapshot;
  return raw as Snapshot;
}

function baseReading(snapshot: Snapshot): Editor {
  const movements: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  snapshot.deliverables.approvedTitles.slice(0, 5).forEach((title) => movements.push(`Entregável aprovado: ${title}.`));
  snapshot.documents.publishedTitles.slice(0, 4).forEach((title) => movements.push(`Documento disponibilizado: ${title}.`));
  snapshot.events.titles.slice(0, 3).forEach((title) => movements.push(`Agenda do período: ${title}.`));
  if (!movements.length) snapshot.deliverables.inProgressTitles.slice(0, 4).forEach((title) => movements.push(`Execução em andamento: ${title}.`));

  snapshot.deliverables.delayedTitles.slice(0, 4).forEach((title) => risks.push(`Prazo impactado por dependência ou resposta do cliente: ${title}.`));
  if (snapshot.deliverables.rebriefingCount) risks.push(`${snapshot.deliverables.rebriefingCount} entregável(eis) exigindo rebriefing.`);
  if (snapshot.hours.consumedPercent !== null && snapshot.hours.consumedPercent >= 80) risks.push(`Consumo de horas em ${Math.round(snapshot.hours.consumedPercent)}% da franquia mensal.`);
  if (snapshot.feedback.lowScoreCount) risks.push(`${snapshot.feedback.lowScoreCount} avaliação(ões) entre 1 e 3 exigem leitura qualitativa.`);

  snapshot.deliverables.clientReviewTitles.slice(0, 4).forEach((title) => nextSteps.push(`Concluir validação do cliente em ${title}.`));
  snapshot.deliverables.inProgressTitles.slice(0, 4).forEach((title) => nextSteps.push(`Avançar a execução de ${title}.`));
  if (snapshot.documents.awaitingFinalCount) nextSteps.push(`Finalizar ${snapshot.documents.awaitingFinalCount} documento(s) que aguardam arquivo final.`);
  if (snapshot.documents.readyCount) nextSteps.push(`Revisar ${snapshot.documents.readyCount} documento(s) pronto(s) para publicação.`);

  const parts = [
    `Em ${monthLabel(snapshot.monthRef)}, ${snapshot.companyName} registrou ${snapshot.deliverables.approvedCount} entregável(eis) aprovado(s)`,
    `${minutesLabel(snapshot.hours.consumedMinutes)} de atuação registrada`,
  ];
  if (snapshot.feedback.count) parts.push(`avaliação média ${snapshot.feedback.average?.toFixed(1).replace('.', ',')} em ${snapshot.feedback.count} resposta(s)`);
  if (snapshot.documents.publishedCount) parts.push(`${snapshot.documents.publishedCount} documento(s) disponibilizado(s)`);

  return {
    summary: `${parts.join('; ')}. Esta é uma leitura-base gerada a partir dos fatos registrados no Workspace e deve ser revisada pela CALI antes da publicação.`,
    movements: movements.join('\n'),
    decisions: '',
    risks: risks.join('\n'),
    nextSteps: nextSteps.join('\n'),
  };
}

export function AdminReportsPageV3() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [monthRef, setMonthRef] = useState(currentMonthRef());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === companyId) || null, [companies, companyId]);
  const companyReports = useMemo(() => reports.filter((item) => item.companyId === companyId), [reports, companyId]);

  useEffect(() => { void loadBaseData(); }, []);
  useEffect(() => { if (companyId && monthRef) void loadPeriod(companyId, monthRef); }, [companyId, monthRef]);
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
        supabase.from('reports').select('id,company_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,published_at,updated_at').neq('status', 'archived').order('reference_month', { ascending: false }),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (reportResult.error) throw reportResult.error;

      const nextCompanies: Company[] = (companyResult.data || []).map((row) => ({
        id: row.id, name: row.display_name, logoUrl: row.logo_url, monthlyHours: Number(row.monthly_hours_contracted || 0), serviceType: row.service_type, servicePlan: row.service_plan,
      }));
      const nextReports: Report[] = (reportResult.data || []).map((row) => ({
        id: row.id, companyId: row.company_id, title: row.title, referenceMonth: String(row.reference_month).slice(0, 7), status: row.status as ReportStatus,
        summary: row.executive_summary || '', movements: Array.isArray(row.movements) ? row.movements.map(String) : [], decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
        risks: Array.isArray(row.risks) ? row.risks.map(String) : [], nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [], sourceSnapshot: normalizeSnapshot(row.source_snapshot),
        protocol: row.protocol || '—', publishedAt: row.published_at, updatedAt: row.updated_at,
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
    const { start, next } = monthBounds(nextMonthRef);
    const company = companies.find((item) => item.id === nextCompanyId);
    try {
      const [projectResult, deliverableResult, hoursResult, feedbackResult, eventResult, fileResult, reportResult] = await Promise.all([
        supabase.from('projects').select('id,name,status,planning_status').eq('company_id', nextCompanyId).neq('status', 'closed'),
        supabase.from('deliverables').select('id,title,status,approved_at,client_delay_business_days,adjustment_count,rebriefing_required').eq('company_id', nextCompanyId),
        supabase.from('hour_entries').select('minutes,category,work_date').eq('company_id', nextCompanyId).gte('work_date', start).lt('work_date', next),
        supabase.from('nps_responses').select('score,comment,created_at').eq('company_id', nextCompanyId).gte('created_at', `${start}T00:00:00-03:00`).lt('created_at', `${next}T00:00:00-03:00`),
        supabase.from('events').select('title,starts_at,cancelled_at').eq('company_id', nextCompanyId).gte('starts_at', `${start}T00:00:00-03:00`).lt('starts_at', `${next}T00:00:00-03:00`).is('cancelled_at', null),
        supabase.from('files').select('title,status,workflow_stage,published_at').eq('company_id', nextCompanyId),
        supabase.from('reports').select('id,company_id,title,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,published_at,updated_at').eq('company_id', nextCompanyId).eq('reference_month', `${nextMonthRef}-01`).maybeSingle(),
      ]);
      const failure = [projectResult.error, deliverableResult.error, hoursResult.error, feedbackResult.error, eventResult.error, fileResult.error, reportResult.error].find(Boolean);
      if (failure) throw failure;

      const deliverables = deliverableResult.data || [];
      const approved = deliverables.filter((item) => item.approved_at && String(item.approved_at) >= `${start}T00:00:00` && String(item.approved_at) < `${next}T00:00:00`);
      const inProgress = deliverables.filter((item) => ['in_progress', 'internal_review'].includes(item.status));
      const clientReview = deliverables.filter((item) => item.status === 'client_review');
      const delayed = deliverables.filter((item) => Number(item.client_delay_business_days || 0) > 0);
      const hours = hoursResult.data || [];
      const consumedMinutes = hours.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
      const categoryMap = new Map<string, number>();
      hours.forEach((item) => categoryMap.set(item.category || 'Sem categoria', (categoryMap.get(item.category || 'Sem categoria') || 0) + Number(item.minutes || 0)));
      const feedback = feedbackResult.data || [];
      const feedbackAverage = feedback.length ? feedback.reduce((sum, item) => sum + Number(item.score || 0), 0) / feedback.length : null;
      const files = fileResult.data || [];
      const published = files.filter((item) => item.status === 'published' && item.published_at && String(item.published_at) >= `${start}T00:00:00` && String(item.published_at) < `${next}T00:00:00`);
      const contractedHours = Number(company?.monthlyHours || 0);

      const nextSnapshot: Snapshot = {
        generatedAt: new Date().toISOString(), companyId: nextCompanyId, companyName: company?.name || 'Cliente', monthRef: nextMonthRef,
        projects: (projectResult.data || []).map((item) => ({ id: item.id, name: item.name, status: item.status, planningStatus: item.planning_status })),
        deliverables: {
          total: deliverables.length, approvedCount: approved.length, approvedTitles: approved.map((item) => item.title),
          inProgressCount: inProgress.length, inProgressTitles: inProgress.map((item) => item.title), clientReviewCount: clientReview.length, clientReviewTitles: clientReview.map((item) => item.title),
          delayedCount: delayed.length, delayedTitles: delayed.map((item) => item.title), adjustmentCount: deliverables.reduce((sum, item) => sum + Number(item.adjustment_count || 0), 0),
          rebriefingCount: deliverables.filter((item) => Boolean(item.rebriefing_required)).length,
        },
        hours: { contractedHours, consumedMinutes, consumedPercent: contractedHours > 0 ? (consumedMinutes / 60 / contractedHours) * 100 : null, entriesCount: hours.length, categories: Array.from(categoryMap.entries()).map(([label, minutes]) => ({ label, minutes })).sort((a, b) => b.minutes - a.minutes) },
        feedback: { count: feedback.length, average: feedbackAverage, lowScoreCount: feedback.filter((item) => Number(item.score) <= 3).length, comments: feedback.map((item) => item.comment).filter(Boolean).map(String) },
        events: { count: (eventResult.data || []).length, titles: (eventResult.data || []).map((item) => item.title) },
        documents: { publishedCount: published.length, publishedTitles: published.map((item) => item.title), awaitingFinalCount: files.filter((item) => item.workflow_stage === 'awaiting_final_file').length, readyCount: files.filter((item) => item.workflow_stage === 'ready_to_publish').length },
      };
      setSnapshot(nextSnapshot);

      if (reportResult.data) {
        const row = reportResult.data;
        const report: Report = {
          id: row.id, companyId: row.company_id, title: row.title, referenceMonth: String(row.reference_month).slice(0, 7), status: row.status as ReportStatus,
          summary: row.executive_summary || '', movements: Array.isArray(row.movements) ? row.movements.map(String) : [], decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
          risks: Array.isArray(row.risks) ? row.risks.map(String) : [], nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [], sourceSnapshot: normalizeSnapshot(row.source_snapshot),
          protocol: row.protocol || '—', publishedAt: row.published_at, updatedAt: row.updated_at,
        };
        setActiveReport(report);
        setEditor({ summary: report.summary, movements: listToLines(report.movements), decisions: listToLines(report.decisions), risks: listToLines(report.risks), nextSteps: listToLines(report.nextSteps) });
      } else {
        setActiveReport(null);
        setEditor(emptyEditor);
      }
    } catch (requestError) {
      setSnapshot(null);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível ler os fatos do período.');
    } finally {
      setLoadingPeriod(false);
    }
  }

  function applyBaseReading() {
    if (!snapshot) return;
    setEditor(baseReading(snapshot));
    setNotice('Leitura-base criada a partir dos dados atuais. Revise antes de salvar.');
  }

  async function persistReport(status: 'draft' | 'review' | 'published') {
    if (!supabase || !snapshot || !selectedCompany) return;
    if (!editor.summary.trim()) { setError('Inclua a leitura executiva antes de salvar.'); return; }
    setSaving(true); setError('');
    const payload = {
      company_id: selectedCompany.id,
      title: `Relatório Executivo · ${selectedCompany.name} · ${monthLabel(monthRef)}`,
      reference_month: `${monthRef}-01`,
      status,
      executive_summary: editor.summary.trim(),
      movements: linesToList(editor.movements), decisions: linesToList(editor.decisions), risks: linesToList(editor.risks), next_steps: linesToList(editor.nextSteps),
      hours_summary: { contracted_hours: snapshot.hours.contractedHours, consumed_minutes: snapshot.hours.consumedMinutes, consumed_percent: snapshot.hours.consumedPercent, categories: snapshot.hours.categories },
      source_snapshot: snapshot,
    };
    try {
      const result = activeReport
        ? await supabase.from('reports').update(payload).eq('id', activeReport.id).select('id').single()
        : await supabase.from('reports').insert(payload).select('id').single();
      if (result.error) throw result.error;
      await supabase.from('activity_log').insert({ company_id: selectedCompany.id, event_type: status === 'published' ? 'report_published' : status === 'review' ? 'report_review_saved' : 'report_draft_saved', entity_type: 'report', entity_id: result.data.id, metadata: { reference_month: monthRef } });
      setNotice(status === 'published' ? 'Relatório publicado.' : status === 'review' ? 'Relatório salvo e marcado como Em revisão.' : 'Rascunho salvo.');
      await loadBaseData();
      await loadPeriod(selectedCompany.id, monthRef);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o relatório.');
    } finally { setSaving(false); }
  }

  async function unpublishReport() {
    if (!supabase || !activeReport) return;
    setSaving(true); setError('');
    const { error: updateError } = await supabase.from('reports').update({ status: 'review' }).eq('id', activeReport.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({ company_id: activeReport.companyId, event_type: 'report_unpublished', entity_type: 'report', entity_id: activeReport.id, metadata: { reference_month: activeReport.referenceMonth } });
      setNotice('Publicação retirada. O relatório voltou para Em revisão.');
      await loadBaseData(); await loadPeriod(activeReport.companyId, activeReport.referenceMonth);
    }
    setSaving(false);
  }

  async function archiveReport() {
    if (!supabase || !activeReport) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('reports').update({ status: 'archived' }).eq('id', activeReport.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({ company_id: activeReport.companyId, event_type: 'report_archived', entity_type: 'report', entity_id: activeReport.id, metadata: { reference_month: activeReport.referenceMonth } });
      setNotice('Relatório arquivado. O histórico do banco foi preservado.');
      setActiveReport(null); setEditor(emptyEditor); await loadBaseData();
    }
    setSaving(false);
  }

  function openHistory(report: Report) {
    setCompanyId(report.companyId);
    setMonthRef(report.referenceMonth);
  }

  if (loadingBase) return <Shell role="admin"><section className="page reports-admin-v3"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando Relatórios…</div></section></Shell>;

  return <Shell role="admin">
    <section className="page reports-admin-v3">
      <div className="eyebrow">LEITURA EXECUTIVA</div>
      <div className="page-heading reports-heading-v3">
        <div><h1>Relatórios</h1><p>O Workspace organiza os fatos do mês. A CALI revisa a leitura, registra decisões e publica somente a versão executiva aprovada.</p></div>
        <div className="reports-period-controls-v3">
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} aria-label="Cliente do relatório">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
          <input type="month" value={monthRef} onChange={(event) => setMonthRef(event.target.value)} aria-label="Mês de referência" />
        </div>
      </div>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice">{error}</div>}

      {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Lendo fatos de {monthLabel(monthRef)}…</div> : snapshot && <>
        <section className="report-kpis-v3">
          <article><FileCheck2 size={19} /><div><strong>{snapshot.deliverables.approvedCount}</strong><span>Entregáveis aprovados</span><small>{snapshot.deliverables.inProgressCount} em andamento · {snapshot.deliverables.clientReviewCount} em validação</small></div></article>
          <article><Clock3 size={19} /><div><strong>{minutesLabel(snapshot.hours.consumedMinutes)}</strong><span>Horas registradas</span><small>{snapshot.hours.contractedHours ? `${Math.round(snapshot.hours.consumedPercent || 0)}% de ${snapshot.hours.contractedHours}h contratadas` : `${snapshot.hours.entriesCount} apontamento(s)`}</small></div></article>
          <article><MessageSquareText size={19} /><div><strong>{snapshot.feedback.average === null ? '—' : snapshot.feedback.average.toFixed(1).replace('.', ',')}</strong><span>Feedback do período</span><small>{snapshot.feedback.count} resposta(s) · {snapshot.feedback.lowScoreCount} nota(s) até 3</small></div></article>
          <article><FileText size={19} /><div><strong>{snapshot.documents.publishedCount}</strong><span>Documentos publicados</span><small>{snapshot.documents.awaitingFinalCount} aguardando arquivo · {snapshot.documents.readyCount} prontos</small></div></article>
        </section>

        <div className="reports-workspace-v3">
          <aside className="report-sources-v3">
            <section className="panel report-source-panel-v3">
              <header><div><span className="section-kicker">FATOS DO PERÍODO</span><h2>Base da leitura</h2></div><button className="secondary" type="button" onClick={() => void loadPeriod(companyId, monthRef)}><RefreshCw size={15} />Atualizar</button></header>
              <div className="report-source-block-v3"><div><ClipboardList size={17} /><strong>Execução</strong></div><p>{snapshot.deliverables.total} entregável(eis) · {snapshot.deliverables.adjustmentCount} ajuste(s)</p>{snapshot.deliverables.delayedCount > 0 && <span className="report-signal-warning-v3"><AlertTriangle size={14} />{snapshot.deliverables.delayedCount} com impacto de prazo</span>}</div>
              <div className="report-source-block-v3"><div><Clock3 size={17} /><strong>Horas</strong></div><p>{minutesLabel(snapshot.hours.consumedMinutes)} no mês{snapshot.hours.contractedHours ? ` de ${snapshot.hours.contractedHours}h contratadas` : ''}.</p>{snapshot.hours.categories.slice(0, 3).map((item) => <small key={item.label}>{item.label}: {minutesLabel(item.minutes)}</small>)}</div>
              <div className="report-source-block-v3"><div><UsersRound size={17} /><strong>Feedback</strong></div><p>{snapshot.feedback.count ? `${snapshot.feedback.count} avaliação(ões), média ${snapshot.feedback.average?.toFixed(1).replace('.', ',')}.` : 'Nenhuma avaliação registrada no mês.'}</p>{snapshot.feedback.comments.slice(0, 2).map((comment, index) => <small key={`${comment}-${index}`}>“{comment}”</small>)}</div>
              <div className="report-source-block-v3"><div><CalendarDays size={17} /><strong>Agenda</strong></div><p>{snapshot.events.count} compromisso(s) no período.</p>{snapshot.events.titles.slice(0, 3).map((title) => <small key={title}>{title}</small>)}</div>
              <footer><ShieldCheck size={14} /><span>Snapshot atual: {formatDateTime(snapshot.generatedAt)}</span></footer>
            </section>
          </aside>

          <section className="panel report-editor-v3">
            <header className="report-editor-header-v3">
              <div><span className="section-kicker">{activeReport?.protocol || 'NOVO RELATÓRIO'}</span><h2>{selectedCompany?.name} · {monthLabel(monthRef)}</h2><p>{activeReport ? `Atualizado ${formatDateTime(activeReport.updatedAt)}` : 'Ainda não existe relatório salvo para este cliente e mês.'}</p></div>
              <div><span className={`report-status-v3 ${activeReport?.status || 'draft'}`}>{activeReport ? statusLabel[activeReport.status] : 'Não salvo'}</span><button className="secondary" type="button" onClick={applyBaseReading}><Sparkles size={15} />Montar leitura-base</button></div>
            </header>

            <div className="report-editor-fields-v3">
              <label className="stacked-label report-summary-field-v3">Leitura executiva<textarea rows={5} value={editor.summary} onChange={(event) => setEditor((current) => ({ ...current, summary: event.target.value }))} placeholder="O que o decisor precisa compreender sobre o mês além dos números?" /></label>
              <div className="report-editor-grid-v3">
                <label className="stacked-label">Movimentos do período<textarea rows={6} value={editor.movements} onChange={(event) => setEditor((current) => ({ ...current, movements: event.target.value }))} placeholder="Um movimento por linha" /></label>
                <label className="stacked-label">Decisões / definições<textarea rows={6} value={editor.decisions} onChange={(event) => setEditor((current) => ({ ...current, decisions: event.target.value }))} placeholder="Uma decisão por linha" /></label>
                <label className="stacked-label">Pontos de atenção<textarea rows={6} value={editor.risks} onChange={(event) => setEditor((current) => ({ ...current, risks: event.target.value }))} placeholder="Riscos, dependências e alertas" /></label>
                <label className="stacked-label">Próximos movimentos<textarea rows={6} value={editor.nextSteps} onChange={(event) => setEditor((current) => ({ ...current, nextSteps: event.target.value }))} placeholder="O que precisa avançar no próximo período" /></label>
              </div>
            </div>

            <footer className="report-editor-footer-v3">
              <div><small>{activeReport?.sourceSnapshot?.generatedAt ? `Snapshot salvo: ${formatDateTime(activeReport.sourceSnapshot.generatedAt)}` : 'Ao salvar, o snapshot do período fica congelado junto ao relatório.'}</small><small>A publicação já fica registrada no banco; o consumo pelo login cliente será ligado quando criarmos esse acesso.</small></div>
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
        {companyReports.length ? <div className="reports-history-list-v3">{companyReports.map((report) => <button key={report.id} type="button" className={activeReport?.id === report.id ? 'active' : ''} onClick={() => openHistory(report)}><span className="report-history-icon-v3"><FileText size={18} /></span><span><small>{report.protocol}</small><strong>{report.title}</strong><em>Atualizado {formatDateTime(report.updatedAt)}</em></span><b className={`report-status-v3 ${report.status}`}>{statusLabel[report.status]}</b></button>)}</div> : <div className="panel report-history-empty-v3"><FileText size={25} /><div><strong>Nenhum relatório salvo para este cliente.</strong><span>Escolha o mês, monte a leitura-base e salve o primeiro rascunho.</span></div></div>}
      </section>
    </section>

    {previewOpen && <div className="modal-backdrop workspace-modal-backdrop" role="presentation"><section className="modal-card report-preview-modal-v3" role="dialog" aria-modal="true" aria-label="Prévia do relatório"><button className="modal-close" type="button" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
      <div className="report-preview-paper-v3">
        <header><div><span>CALI RH · RELATÓRIO EXECUTIVO</span><strong>{selectedCompany?.name}</strong></div><span>{monthLabel(monthRef)}</span></header>
        <section className="report-preview-lead-v3"><span className="section-kicker">LEITURA EXECUTIVA</span><h2>O que este ciclo colocou em movimento</h2><p>{editor.summary}</p></section>
        {linesToList(editor.movements).length > 0 && <section><span className="section-kicker">MOVIMENTOS DO PERÍODO</span><ul>{linesToList(editor.movements).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        {linesToList(editor.decisions).length > 0 && <section><span className="section-kicker">DECISÕES E DEFINIÇÕES</span><ul>{linesToList(editor.decisions).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        {linesToList(editor.risks).length > 0 && <section className="attention"><span className="section-kicker">PONTOS DE ATENÇÃO</span><ul>{linesToList(editor.risks).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        {linesToList(editor.nextSteps).length > 0 && <section><span className="section-kicker">PRÓXIMOS MOVIMENTOS</span><ul>{linesToList(editor.nextSteps).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        <footer><span>{activeReport?.protocol || 'Protocolo gerado ao salvar'}</span><span>Patrícia Lima · CALI RH</span></footer>
      </div>
    </section></div>}
  </Shell>;
}
