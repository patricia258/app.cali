import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useSearchParams } from '../../../hooks/useSearchParams';
import { AdminMaterialReview } from '../../material-review/AdminMaterialReview';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Eye, FileText, Loader2, Mail, Printer, RefreshCw, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { WorkspaceExecutiveReportPaper } from '../../../components/reports/WorkspaceExecutiveReportPaper';
import { ReportManualComplementsPanel } from '../../../components/reports/ReportManualComplementsPanel';
import {
  approveExecutiveReport, createReportDraft, deleteReportDraft, deliverExecutiveReport, readCurrentReportPeriod,
  readFreshReportPeriod, readReportPortfolio, readReportReadiness, readReportRecipients, refreshReportFacts,
  saveReportEditorialDraft, startReportReview, type FreshPeriodData, type ReportReadiness,
} from '../../../api/reports/admin';
import { endOfMonth, endOfQuarter, format, startOfMonth, startOfQuarter } from 'date-fns';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { reportTypeLabel, type ReportEditor, type ReportType } from '../../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../../lib/reportIntelligence';
import { deliveryRowsForPdf, deliveryTimingLabelV14, formatHoursV14, isAlertDismissed, periodLabelV14, reportKpisV14, type DeliveryPerformanceRow, type DismissedReportAlert, type ReportCloseAlert, type ReportLifecycleStatus } from '../../../lib/reportV14';
import { buildReportAlertsV15, capacitySignalV15 } from '../../../lib/reportV15';
import { reportReviewCountsV16 } from '../../../lib/reportV16';
import { buildEditorialSeedV17, decisionCandidatesV17, demandCandidatesV17, periodChangeSignalsV17 } from '../../../lib/reportEditorialV17';
import { attachReportManualComplements, augmentReportData, emptyReportManualComplements, reportManualComplementsFromSnapshot, type ReportManualComplements } from '../../../lib/reportManualComplements';

type Company = { id: string; name: string; logoUrl?: string | null; serviceType?: string | null; servicePlan?: string | null };
type Report = {
  id: string;
  companyId: string;
  title: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  status: ReportLifecycleStatus;
  summary: string;
  movements: string[];
  decisions: string[];
  risks: string[];
  nextSteps: string[];
  snapshot: IntelligenceSnapshot | null;
  protocol: string;
  updatedAt: string;
  version: number;
  revisionParentId?: string | null;
  dismissedAlerts: DismissedReportAlert[];
  internalNote: string;
  dataRefreshedAt?: string | null;
  reviewStartedAt?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  sentTo: string[];
};
const emptyEditor: ReportEditor = { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' };
const statusLabel: Record<ReportLifecycleStatus, string> = { draft: 'Rascunho', review: 'Em revisão', approved: 'Aprovado', sent: 'Enviado', published: 'Publicado', archived: 'Arquivado' };

function isoDate(date: Date) { return format(date, 'yyyy-MM-dd'); }
function monthlyPeriod(date = new Date()) { return { start: isoDate(startOfMonth(date)), end: isoDate(endOfMonth(date)) }; }
function quarterlyPeriod(date = new Date()) { return { start: isoDate(startOfQuarter(date)), end: isoDate(endOfQuarter(date)) }; }
function quarterKey(value: string) { const [year, month] = value.split('-').map(Number); return `${year}-Q${Math.floor((month - 1) / 3) + 1}`; }
function quarterPeriod(value: string) { const [yearText, quarterText] = value.split('-Q'); const year = Number(yearText), quarter = Number(quarterText), startMonth = (quarter - 1) * 3; return { start: isoDate(new Date(year, startMonth, 1)), end: isoDate(new Date(year, startMonth + 3, 0)) }; }
function quarterOptions() { const year = new Date().getFullYear(); const values: Array<{ value: string; label: string }> = []; for (let y = year + 1; y >= year - 6; y -= 1) for (let q = 4; q >= 1; q -= 1) values.push({ value: `${y}-Q${q}`, label: `${q}º trimestre · ${y}` }); return values; }
function lines(value: string) { return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean); }
function formatDate(value?: string | null) { if (!value) return '—'; const date = new Date(`${String(value).slice(0, 10)}T12:00:00`); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); }
function formatDateTime(value?: string | null) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); }
function dismissedFrom(value: unknown): DismissedReportAlert[] { return Array.isArray(value) ? value.filter((item: any) => item && item.id && item.reason).map((item: any) => ({ id: String(item.id), reason: String(item.reason), dismissedAt: String(item.dismissedAt || item.dismissed_at || new Date().toISOString()) })) : []; }
function reportRow(row: any): Report { return { id: row.id, companyId: row.company_id, title: row.title, reportType: (row.report_type || 'monthly') as ReportType, periodStart: String(row.period_start || row.reference_month).slice(0, 10), periodEnd: String(row.period_end || row.reference_month).slice(0, 10), status: row.status as ReportLifecycleStatus, summary: row.executive_summary || '', movements: Array.isArray(row.movements) ? row.movements.map(String) : [], decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [], risks: Array.isArray(row.risks) ? row.risks.map(String) : [], nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [], snapshot: normalizeIntelligenceSnapshot(row.source_snapshot), protocol: row.protocol || '—', updatedAt: row.updated_at, version: Number(row.version || 1), revisionParentId: row.revision_parent_id, dismissedAlerts: dismissedFrom(row.dismissed_alerts), internalNote: row.internal_note || '', dataRefreshedAt: row.data_refreshed_at, reviewStartedAt: row.review_started_at, approvedAt: row.approved_at, sentAt: row.sent_at, sentTo: Array.isArray(row.sent_to) ? row.sent_to.map(String) : [] }; }
function editorFrom(report: Report): ReportEditor { return { summary: report.summary, movements: report.movements.join('\n'), decisions: report.decisions.join('\n'), risks: report.risks.join('\n'), nextSteps: report.nextSteps.join('\n') }; }
function frozenDeliveryRows(snapshot: IntelligenceSnapshot | null) { const raw = (snapshot as any)?.deliveryPerformanceV14; return Array.isArray(raw) ? raw as DeliveryPerformanceRow[] : null; }

function EditorialField({ title, value, onChange, helper, rows = 5, locked }: { title: string; value: string; onChange: (value: string) => void; helper: string; rows?: number; locked: boolean }) {
  return <div className="reports-v16-editor-field"><div><h3>{title}</h3><p>{helper}</p></div><textarea rows={rows} value={value} readOnly={locked} onChange={(event) => onChange(event.target.value)} /></div>;
}

export function AdminReportsPageV17() {
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
  const [searchParams] = useSearchParams();
  const deepLinkedReport = searchParams.get('report');
  const initial = monthlyPeriod();
  const [companies, setCompanies] = useState<Company[]>([]), [reports, setReports] = useState<Report[]>([]);
  const [companyId, setCompanyId] = useState(''), [reportType, setReportType] = useState<ReportType>('monthly'), [periodStart, setPeriodStart] = useState(initial.start), [periodEnd, setPeriodEnd] = useState(initial.end);
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot | null>(null), [liveSnapshot, setLiveSnapshot] = useState<IntelligenceSnapshot | null>(null), [deliveries, setDeliveries] = useState<DeliveryPerformanceRow[]>([]), [activeReport, setActiveReport] = useState<Report | null>(null);
  const [editor, setEditor] = useState<ReportEditor>(emptyEditor), [internalNote, setInternalNote] = useState(''), [dismissedAlerts, setDismissedAlerts] = useState<DismissedReportAlert[]>([]);
  const [manualComplements, setManualComplements] = useState<ReportManualComplements>(emptyReportManualComplements());
  const [readiness, setReadiness] = useState<ReportReadiness | null>(null);
  const [loadingBase, setLoadingBase] = useState(true), [loadingPeriod, setLoadingPeriod] = useState(false), [saving, setSaving] = useState(false), [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle'), [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState(''), [error, setError] = useState(''), [previewOpen, setPreviewOpen] = useState(false);
  const [dismissTarget, setDismissTarget] = useState<ReportCloseAlert | null>(null), [dismissReason, setDismissReason] = useState('');
  const [sendOpen, setSendOpen] = useState(false), [sendRecipients, setSendRecipients] = useState(''), [sendMessage, setSendMessage] = useState(''), [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const lastSavedPayload = useRef('');

  const selectedCompany = useMemo(() => companies.find((item) => item.id === companyId) || null, [companies, companyId]);
  const periodName = periodLabelV14(reportType, periodStart), quarters = useMemo(() => quarterOptions(), []);
  const companyReports = useMemo(() => reports.filter((item) => item.companyId === companyId).sort((a, b) => b.periodStart.localeCompare(a.periodStart) || b.version - a.version), [reports, companyId]);
  const effectiveReportData = useMemo(() => snapshot ? augmentReportData(snapshot, deliveries, manualComplements) : null, [snapshot, deliveries, manualComplements]);
  const effectiveSnapshot = effectiveReportData?.snapshot || snapshot;
  const effectiveDeliveries = effectiveReportData?.deliveries || deliveries;
  const alerts = useMemo(() => effectiveSnapshot ? buildReportAlertsV15(effectiveSnapshot, effectiveDeliveries) : [], [effectiveSnapshot, effectiveDeliveries]);
  const unresolvedAlerts = useMemo(() => alerts.filter((item) => !isAlertDismissed(item, dismissedAlerts)), [alerts, dismissedAlerts]);
  const unresolvedBlocking = useMemo(() => unresolvedAlerts.filter((item) => item.blocking), [unresolvedAlerts]);
  const decisionOptions = useMemo(() => snapshot ? Array.from(new Set([...decisionCandidatesV17(snapshot), ...lines(editor.decisions)])) : [], [snapshot, editor.decisions]);
  const demandChoices = useMemo(() => snapshot ? Array.from(new Set([...demandCandidatesV17(snapshot), ...lines(editor.movements)])) : [], [snapshot, editor.movements]);
  const selectedDecisions = useMemo(() => new Set(lines(editor.decisions)), [editor.decisions]);
  const selectedDemands = useMemo(() => new Set(lines(editor.movements)), [editor.movements]);
  const kpis = useMemo(() => effectiveSnapshot ? reportKpisV14(effectiveSnapshot, effectiveDeliveries) : null, [effectiveSnapshot, effectiveDeliveries]);
  const periodDeliveries = useMemo(() => effectiveSnapshot ? deliveryRowsForPdf(effectiveSnapshot, effectiveDeliveries) : [], [effectiveSnapshot, effectiveDeliveries]);
  const capacitySignal = useMemo(() => effectiveSnapshot ? capacitySignalV15(effectiveSnapshot) : null, [effectiveSnapshot]);
  const changes = useMemo(() => effectiveSnapshot ? periodChangeSignalsV17(effectiveSnapshot, reportType) : [], [effectiveSnapshot, reportType]);
  const reviewCounts = useMemo(() => effectiveSnapshot ? reportReviewCountsV16(effectiveSnapshot, effectiveDeliveries, selectedDemands.size, selectedDecisions.size, unresolvedAlerts.length) : null, [effectiveSnapshot, effectiveDeliveries, selectedDemands.size, selectedDecisions.size, unresolvedAlerts.length]);
  const isSimulation = Boolean((activeReport?.snapshot as any)?.workflow_mode === 'simulation');
  const canEdit = Boolean(!activeReport || activeReport.status === 'draft' || activeReport.status === 'review');
  const lifecycleStatus = activeReport?.status || 'draft';

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (companyId && periodStart && periodEnd) void loadPeriod(companyId, reportType, periodStart, periodEnd); }, [companyId, reportType, periodStart, periodEnd]);
  useEffect(() => { if (!previewOpen && !dismissTarget && !sendOpen) return; document.body.classList.add('workspace-modal-open'); return () => document.body.classList.remove('workspace-modal-open'); }, [previewOpen, dismissTarget, sendOpen]);
  useEffect(() => {
    if (!activeReport || !canEdit) return;
    const payload = JSON.stringify({ summary: editor.summary, movements: editor.movements, decisions: editor.decisions, risks: editor.risks, nextSteps: editor.nextSteps, internalNote, dismissedAlerts, manualComplements });
    if (payload === lastSavedPayload.current) return;
    setAutosaveState('saving');
    const timer = window.setTimeout(async () => {
      try {
        await saveReportEditorialDraft(activeReport.id, {
          editor, internalNote, dismissedAlerts,
          snapshot: snapshot ? attachReportManualComplements(snapshot, manualComplements) : activeReport.snapshot,
        });
      } catch (reason) {
        setAutosaveState('error');
        setError(`Autosave: ${reason instanceof Error ? reason.message : 'Não foi possível salvar.'}`);
        return;
      }
      lastSavedPayload.current = payload; setAutosaveState('saved'); setLastSavedAt(new Date().toISOString());
    }, 850);
    return () => window.clearTimeout(timer);
  }, [activeReport?.id, canEdit, editor, internalNote, dismissedAlerts, manualComplements, snapshot]);

  async function loadBase() {
    setLoadingBase(true); setError('');
    try {
      const portfolio = await readReportPortfolio();
      const nextCompanies: Company[] = portfolio.companies.map((row) => ({
        id: row.id, name: row.display_name, logoUrl: row.logo_url || '', serviceType: row.service_type, servicePlan: row.service_plan,
      }));
      const logoRows = await Promise.all(portfolio.companies.map(async (row) => [
        row.id,
        await resolveWorkspaceMedia(row.logo_url || row.logo_workspace_url, 86400, true) || await resolveWorkspaceMedia(row.logo_workspace_url, 86400, true),
      ] as const));
      const logoMap=new Map(logoRows);
      setCompanies(nextCompanies.map((company)=>({...company,logoUrl:logoMap.get(company.id)||''})));
      const nextReports = portfolio.reports.map(reportRow);
      setReports(nextReports);
      const requested = !companyId && deepLinkedReport && nextReports.find((row) => row.id === deepLinkedReport);
      if (requested) {
        setCompanyId(requested.companyId);
        setReportType(requested.reportType);
        setPeriodStart(requested.periodStart);
        setPeriodEnd(requested.periodEnd);
      } else if (!companyId && nextCompanies.length) setCompanyId(nextCompanies[0].id);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar Relatórios.'); }
    finally { setLoadingBase(false); }
  }

  async function createDraft(fresh: FreshPeriodData, version = 1, parentId: string | null = null, mode: 'official' | 'simulation' = 'official', initialEditor?: ReportEditor, initialInternalNote = '', initialManual: ReportManualComplements = emptyReportManualComplements()) {
    if (!selectedCompany) throw new Error('Cliente não selecionado.');
    const seed = buildEditorialSeedV17(fresh.snapshot, reportType);
    const sourceSnapshot = attachReportManualComplements({ ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: mode, ...(mode === 'simulation' ? { simulation_of: parentId, simulation_marked_at: new Date().toISOString() } : {}) } as IntelligenceSnapshot, initialManual);
    const payload = {
      company_id: selectedCompany.id,
      title: `Relatório Executivo ${reportTypeLabel[reportType]} · ${selectedCompany.name} · ${periodName}`,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      reference_month: `${periodStart.slice(0, 7)}-01`,
      status: 'draft' as const,
      version,
      revision_parent_id: parentId,
      executive_summary: initialEditor ? initialEditor.summary : seed.summary,
      movements: initialEditor ? lines(initialEditor.movements) : [],
      decisions: initialEditor ? lines(initialEditor.decisions) : [],
      risks: initialEditor ? lines(initialEditor.risks) : [],
      next_steps: initialEditor ? lines(initialEditor.nextSteps) : [],
      source_snapshot: sourceSnapshot,
      service_type_snapshot: fresh.snapshot.contract.serviceType || selectedCompany.serviceType || null,
      service_plan_snapshot: fresh.snapshot.contract.servicePlan || selectedCompany.servicePlan || null,
      contracted_hours_snapshot: fresh.snapshot.contract.contractedHoursPeriod,
      data_refreshed_at: new Date().toISOString(),
      dismissed_alerts: [],
      internal_note: initialEditor ? (initialInternalNote.trim() || null) : null,
    };
    await createReportDraft(payload, mode);
  }

  async function loadPeriod(nextCompanyId: string, nextType: ReportType, nextStart: string, nextEnd: string) {
    setLoadingPeriod(true); setError(''); setNotice(''); setAutosaveState('idle');
    try {
      const [fresh, nextReadiness] = await Promise.all([readFreshReportPeriod(nextCompanyId, nextType, nextStart, nextEnd), readReportReadiness(nextCompanyId, nextType, nextStart, nextEnd)]);
      setLiveSnapshot(fresh.snapshot); setReadiness(nextReadiness);
      const reportResult = await readCurrentReportPeriod(nextCompanyId, nextType, nextStart, nextEnd);

      if (!reportResult) {
        setActiveReport(null);
        setSnapshot(fresh.snapshot);
        setDeliveries(fresh.deliveries);
        setEditor(buildEditorialSeedV17(fresh.snapshot, nextType));
        setManualComplements(emptyReportManualComplements());
        setInternalNote(''); setDismissedAlerts([]); setLastSavedAt(null); lastSavedPayload.current = '';
        return;
      }

      const report = reportRow(reportResult), savedSnapshot = report.snapshot || fresh.snapshot;
      const frozen = frozenDeliveryRows(savedSnapshot);
      const useFrozen = ['approved', 'sent', 'published'].includes(report.status) && frozen;
      const savedManual = reportManualComplementsFromSnapshot(savedSnapshot);
      setActiveReport(report); setSnapshot(savedSnapshot); setDeliveries(useFrozen ? frozen! : fresh.deliveries); setEditor(editorFrom(report)); setManualComplements(savedManual); setInternalNote(report.internalNote); setDismissedAlerts(report.dismissedAlerts); setLastSavedAt(report.updatedAt);
      lastSavedPayload.current = JSON.stringify({ summary: report.summary, movements: report.movements.join('\n'), decisions: report.decisions.join('\n'), risks: report.risks.join('\n'), nextSteps: report.nextSteps.join('\n'), internalNote: report.internalNote, dismissedAlerts: report.dismissedAlerts, manualComplements: savedManual });
    } catch (requestError) {
      setSnapshot(null); setLiveSnapshot(null); setDeliveries([]); setActiveReport(null); setEditor(emptyEditor); setManualComplements(emptyReportManualComplements()); setReadiness(null); setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o fechamento.');
    } finally { setLoadingPeriod(false); }
  }

  function changeType(next: ReportType) { setReportType(next); const anchor = new Date(`${periodStart}T12:00:00`), period = next === 'monthly' ? monthlyPeriod(anchor) : quarterlyPeriod(anchor); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function changeMonth(value: string) { const [year, month] = value.split('-').map(Number), period = monthlyPeriod(new Date(year, month - 1, 1)); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function changeQuarter(value: string) { const period = quarterPeriod(value); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function toggleSelection(value: string, kind: 'decisions' | 'movements') { if (!canEdit) return; const current = new Set(lines(editor[kind])); current.has(value) ? current.delete(value) : current.add(value); setEditor((state) => ({ ...state, [kind]: Array.from(current).join('\n') })); }

  async function createOfficialClosing() {
    if (!liveSnapshot) return;
    setSaving(true); setError('');
    try {
      const currentReadiness = await readReportReadiness(companyId, reportType, periodStart, periodEnd);
      if (currentReadiness && !currentReadiness.can_generate_official) throw new Error(`O fechamento oficial ainda não está disponível. A coleta mínima é de ${currentReadiness.required_days} dias.`);
      const fresh = await readFreshReportPeriod(companyId, reportType, periodStart, periodEnd);
      await createDraft(fresh, 1, null, 'official', editor, internalNote, manualComplements);
      setNotice('Fechamento oficial criado. A curadoria que você preparou na prévia foi preservada.');
      await loadBase(); await loadPeriod(companyId, reportType, periodStart, periodEnd);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o fechamento oficial.'); }
    finally { setSaving(false); }
  }

  async function refreshData() {
    if (!activeReport || !canEdit) return;
    setSaving(true); setError('');
    try {
      const fresh = await readFreshReportPeriod(companyId, reportType, periodStart, periodEnd);
      const previousMode = (activeReport.snapshot as any)?.workflow_mode || 'official';
      const sourceSnapshot = attachReportManualComplements({ ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: previousMode, ...((activeReport.snapshot as any)?.simulation_of ? { simulation_of: (activeReport.snapshot as any).simulation_of } : {}) } as IntelligenceSnapshot, manualComplements);
      await refreshReportFacts(activeReport.id, sourceSnapshot, {
        serviceType: fresh.snapshot.contract.serviceType || selectedCompany?.serviceType || null,
        servicePlan: fresh.snapshot.contract.servicePlan || selectedCompany?.servicePlan || null,
        contractedHours: fresh.snapshot.contract.contractedHoursPeriod,
      });
      setSnapshot(fresh.snapshot); setLiveSnapshot(fresh.snapshot); setDeliveries(fresh.deliveries); setNotice('Dados automáticos atualizados. Sua curadoria editorial foi preservada.'); await loadBase();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar os dados.'); }
    finally { setSaving(false); }
  }

  async function startReview() {
    if (!activeReport || activeReport.status !== 'draft') return;
    if (isSimulation) { setError('Simulações internas não podem entrar em revisão oficial.'); return; }
    if (readiness && !readiness.can_generate_official) { setError(`A revisão oficial fica disponível após ${readiness.required_days} dias de coleta.`); return; }
    setSaving(true);
    try {
      await startReportReview(activeReport.id);
      setNotice('Relatório em revisão. Confira interpretação, relevância e direção antes de aprovar.');
      await loadBase();
      await loadPeriod(companyId, reportType, periodStart, periodEnd);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a revisão.');
    } finally {
      setSaving(false);
    }
  }

  async function approveReport() {
    if (!activeReport || !snapshot || activeReport.status !== 'review') return;
    if (isSimulation) { setError('Simulações internas não podem ser aprovadas.'); return; }
    if (!editor.summary.trim()) { setError('A leitura executiva precisa estar preenchida antes da aprovação.'); return; }
    if (unresolvedBlocking.length) { setError(`Existem ${unresolvedBlocking.length} item(ns) que precisam ser corrigidos antes da aprovação.`); return; }
    setSaving(true); setError('');
    try {
      const sourceSnapshot = attachReportManualComplements({ ...snapshot, deliveryPerformanceV14: deliveries, workflow_mode: 'official' } as IntelligenceSnapshot, manualComplements);
      await approveExecutiveReport(activeReport.id, activeReport.version, {
        companyId, type: reportType, start: periodStart, end: periodEnd,
      }, { editor, internalNote, dismissedAlerts, snapshot: sourceSnapshot });
      setNotice('Relatório aprovado e congelado. A próxima ação é enviar ao cliente.'); await loadBase(); await loadPeriod(companyId, reportType, periodStart, periodEnd);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível aprovar o relatório.'); }
    finally { setSaving(false); }
  }

  async function openSend() {
    if (!activeReport) return;
    setSendMessage(''); setSendError(''); setError('');
    const recipients = await readReportRecipients(companyId).catch(() => []);
    setSendRecipients(recipients.join(', '));
    setSendOpen(true);
  }

  async function sendReport() {
    if (!activeReport || sending || !['approved', 'sent', 'published'].includes(activeReport.status)) return;
    const recipients = sendRecipients.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
    if (!recipients.length) { setSendError('Informe pelo menos um e-mail de destinatário.'); return; }
    const requestId = confirmDelivery(recipients, [activeReport.id, activeReport.version, sendMessage]);
    if (!requestId) return;
    setSending(true); setSendError('');
    try {
      await deliverExecutiveReport(activeReport.id, activeReport.version, requestId, recipients, sendMessage);
      completeDelivery();
      setSendOpen(false);
      await loadBase();
      await loadPeriod(companyId, reportType, periodStart, periodEnd);
      setNotice('Relatório disponibilizado no Workspace e enviado por e-mail.');
    } catch (requestError) {
      setSendError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o relatório.');
    }
    finally { setSending(false); }
  }

  async function createNewVersion() {
    if (!activeReport || !liveSnapshot || !['approved', 'sent', 'published'].includes(activeReport.status)) return;
    setSaving(true); setError('');
    try {
      const fresh = await readFreshReportPeriod(companyId, reportType, periodStart, periodEnd);
      const simulation = ['sent', 'published'].includes(activeReport.status);
      await createDraft(fresh, activeReport.version + 1, activeReport.id, simulation ? 'simulation' : 'official', undefined, '', manualComplements);
      setNotice(simulation ? 'Simulação interna criada. Ela não altera nem substitui a versão enviada ao cliente.' : `Versão ${activeReport.version + 1} criada como novo rascunho.`);
      await loadBase(); await loadPeriod(companyId, reportType, periodStart, periodEnd);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar a nova versão.'); }
    finally { setSaving(false); }
  }

  async function deleteReport(report: Report) {
    if (!['draft', 'review'].includes(report.status)) return;
    const ok = window.confirm(`Excluir definitivamente ${periodLabelV14(report.reportType, report.periodStart)} · v${report.version}?`); if (!ok) return;
    try {
      await deleteReportDraft(report.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o rascunho.');
      return;
    }
    setNotice('Rascunho excluído.'); await loadBase(); if (report.id === activeReport?.id) await loadPeriod(companyId, reportType, periodStart, periodEnd);
  }

  function dismissAlert() { if (!dismissTarget || !dismissReason.trim()) return; setDismissedAlerts((current) => [...current.filter((item) => item.id !== dismissTarget.id), { id: dismissTarget.id, reason: dismissReason.trim(), dismissedAt: new Date().toISOString() }]); setDismissTarget(null); setDismissReason(''); }
  function restoreAlert(id: string) { if (!canEdit) return; setDismissedAlerts((current) => current.filter((item) => item.id !== id)); }
  function openPrint() { if (activeReport) window.open(`/admin/relatorios/impressao/${activeReport.id}?print=1`, '_blank', 'noopener,noreferrer'); }
  function primaryAction() {
    if (!activeReport) return null;
    if (isSimulation) return <Button variant="primary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={16} />Ver simulação</Button>;
    if (activeReport.status === 'draft') return <Button variant="primary" type="button" disabled={saving || Boolean(readiness && !readiness.can_generate_official)} onClick={() => void startReview()}><Eye size={16} />Iniciar revisão</Button>;
    if (activeReport.status === 'review') return <Button variant="primary" type="button" disabled={saving} onClick={() => void approveReport()}><CheckCircle2 size={16} />Aprovar relatório</Button>;
    if (activeReport.status === 'approved') return <Button variant="primary" type="button" disabled={saving} onClick={() => void openSend()}><Send size={16} />Enviar ao cliente</Button>;
    if (['sent', 'published'].includes(activeReport.status)) {
      return <>
        <Button variant="secondary" type="button" disabled={saving} onClick={() => void openSend()}><Send size={16} />Reenviar ao cliente</Button>
        <Button variant="primary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={16} />Ver relatório</Button>
      </>;
    }
    return <Button variant="primary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={16} />Ver relatório</Button>;
  }

  if (loadingBase) return <Shell role="admin"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando fechamento executivo…</section></Shell>;
  const contractedMinutes = Math.max(0, Number(kpis?.contractedHours || 0) * 60), usedMinutes = Math.max(0, Number(kpis?.consumedMinutes || 0)), extraMinutes = Math.max(0, usedMinutes - contractedMinutes), usagePercent = contractedMinutes ? Math.round((usedMinutes / contractedMinutes) * 100) : null;
  const hasCapacity = contractedMinutes > 0 || usedMinutes > 0;
  const hasPlanned = Number(kpis?.plannedDeliveries || 0) > 0;
  const hasAdherence = kpis?.deliveryAdherence !== null && kpis?.deliveryAdherence !== undefined;

  const history = <section className="reports-v16-history"><div className="reports-v16-section-heading"><span>08</span><div><h2>Histórico e versões</h2><p>Versões oficiais preservam o fechamento do período. Rascunhos e simulações só existem quando você os cria.</p></div></div><div className="reports-v16-history-table"><div className="head"><span>Período</span><span>Versão</span><span>Status</span><span>Data</span><span>Ações</span></div>{companyReports.slice(0, 12).map((report) => <div className={report.id === activeReport?.id ? 'active' : ''} key={report.id} data-report-id={report.id}><button type="button" className="period" onClick={() => { setReportType(report.reportType); setPeriodStart(report.periodStart); setPeriodEnd(report.periodEnd); }}>{periodLabelV14(report.reportType, report.periodStart)}</button><span>v{report.version}</span><span>{(report.snapshot as any)?.workflow_mode === 'simulation' ? 'Simulação' : statusLabel[report.status]}</span><span>{formatDateTime(report.sentAt || report.approvedAt || report.updatedAt)}</span><span className="actions"><button type="button" onClick={() => {
      if (report.status === 'archived') {
        window.open(`/admin/relatorios/impressao/${encodeURIComponent(report.id)}`, '_blank', 'noopener,noreferrer');
      } else {
        setReportType(report.reportType); setPeriodStart(report.periodStart); setPeriodEnd(report.periodEnd);
      }
    }}>{report.status === 'archived' ? 'Ver versão arquivada' : 'Abrir'}</button>{['draft', 'review'].includes(report.status) ? <button type="button" className="delete" onClick={() => void deleteReport(report)} aria-label="Excluir versão"><Trash2 size={14} /></button> : null}</span></div>)}</div></section>;

  const previewEditorial = <>
    {changes.length ? <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>03</span><div><h2>{reportType === 'quarterly' ? 'Evolução dentro do trimestre' : 'O que mudou'}</h2><p>Só existe comparativo quando há base real nos dois períodos.</p></div></div><div className="reports-v16-change-grid">{changes.map((item) => <article className={`tone-${item.tone}`} key={item.id}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}</div></section> : null}
    <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>04</span><div><h2>Curadoria de demandas e decisões</h2><p>Você pode preparar a curadoria agora. Nada é gravado até criar o fechamento oficial.</p></div></div><div className="reports-v16-selection-grid"><div><h3>Demandas para leitura interna</h3>{demandChoices.length ? <div className="reports-v16-check-list">{demandChoices.map((item) => <label key={item}><input type="checkbox" checked={selectedDemands.has(item)} onChange={() => toggleSelection(item, 'movements')} /><span>{item}</span></label>)}</div> : <p className="reports-v16-empty">Nenhuma demanda estruturada foi registrada.</p>}</div><div><h3>Decisões registradas</h3>{decisionOptions.length ? <div className="reports-v16-check-list">{decisionOptions.map((item) => <label key={item}><input type="checkbox" checked={selectedDecisions.has(item)} onChange={() => toggleSelection(item, 'decisions')} /><span>{item}</span></label>)}</div> : <p className="reports-v16-empty">Nenhuma decisão estruturada foi registrada.</p>}</div></div></section>
    <section className="reports-v16-section reports-v16-alert-section"><div className="reports-v16-section-heading"><span>05</span><div><h2>Conferência antes da aprovação</h2><p>{unresolvedAlerts.length ? `${unresolvedAlerts.length} ponto(s) merecem conferência antes de fechar.` : 'Nenhuma pendência aberta.'}</p></div></div>{unresolvedAlerts.length ? <div className="reports-v16-alert-list">{unresolvedAlerts.map((alert) => <article key={alert.id}><div><strong>{alert.blocking ? 'Precisa corrigir' : 'Atenção'}</strong><span><b>{alert.title}</b><p>{alert.detail}</p></span></div><div>{alert.actionHref ? <a href={alert.actionHref}>{alert.actionLabel || 'Ver origem'}</a> : null}</div></article>)}</div> : <div className="reports-v16-ok"><CheckCircle2 size={18} />Os fatos estão consistentes para o fechamento.</div>}</section>
    <section className="reports-v16-section reports-v16-editorial"><div className="reports-v16-section-heading"><span>06</span><div><h2>Leitura executiva CALI</h2><p>Estes campos continuam editáveis antes do fechamento. O conteúdo será levado para a versão oficial quando você criá-la.</p></div></div><EditorialField title={reportType === 'quarterly' ? 'Leitura executiva do trimestre' : 'Leitura executiva do mês'} value={editor.summary} onChange={(value) => setEditor((current) => ({ ...current, summary: value }))} helper="3–5 linhas. Explique o que o período revela; não copie logs, dúvidas ou tabelas." rows={7} locked={false} /><EditorialField title="Pontos de atenção para o cliente" value={editor.risks} onChange={(value) => setEditor((current) => ({ ...current, risks: value }))} helper="Até 3 pontos. Traga risco + recomendação + dependência, sem repetir o texto da leitura executiva." rows={5} locked={false} /></section>
    <section className="reports-v16-section reports-v16-editorial"><div className="reports-v16-section-heading"><span>07</span><div><h2>{reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : 'Prioridades do próximo ciclo'}</h2><p>Feche olhando para frente. Prioridade não repete ponto de atenção.</p></div></div><EditorialField title="Prioridades" value={editor.nextSteps} onChange={(value) => setEditor((current) => ({ ...current, nextSteps: value }))} helper="1–3 movimentos. Inclua prazo, responsável ou dependência quando isso mudar a leitura." rows={5} locked={false} /></section>
    <details className="reports-v16-internal"><summary>Adicionar nota interna</summary><p>Visível somente para você. A nota só passa a ser gravada quando o fechamento oficial for criado.</p><textarea rows={4} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Anotação para a conversa ou para o próximo fechamento." /></details>
  </>;

  // Trilha do fechamento: mostra em que etapa o relatório do período está.
  const stageIndex = !activeReport ? 0 : isSimulation ? 1 : ['sent', 'published'].includes(lifecycleStatus) ? 3 : lifecycleStatus === 'approved' ? 2 : 1;
  const stages = ['Prévia interna', isSimulation ? 'Simulação interna' : 'Fechamento em revisão', 'Aprovado', 'Enviado ao cliente'];

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-reports v2-client-module"><div className="ap-content"><section className="wf reports-admin-v16">
    {activeReport && ['draft','review'].includes(activeReport.status) && <AdminMaterialReview kind="report" entityId={activeReport.id} companyId={activeReport.companyId} />}
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Relatórios</h1><p>Fechamento executivo de cada conta: fatos do período, curadoria, leitura da CALI, aprovação e envio ao cliente.</p></div></div>
    <div className="wf-controls v2-report-controls"><ol className="v2-report-stages" aria-label="Etapa do fechamento">{stages.map((label, index) => <li key={label} className={index < stageIndex ? 'done' : index === stageIndex ? 'current' : ''}><b>{index + 1}</b><span>{label}</span></li>)}</ol><div className="reports-v16-filters"><label>Empresa<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label><label>Tipo<select value={reportType} onChange={(event) => changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>{reportType === 'monthly' ? <label>Período<input type="month" value={periodStart.slice(0, 7)} onChange={(event) => changeMonth(event.target.value)} /></label> : <label>Período<select value={quarterKey(periodStart)} onChange={(event) => changeQuarter(event.target.value)}>{quarters.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}</div></div>
    {notice ? <InlineNotice tone="success"><CheckCircle2 size={18} />{notice}</InlineNotice> : null}{error ? <InlineNotice><AlertTriangle size={18} />{error}</InlineNotice> : null}

    {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Lendo {periodName}…</div> : snapshot && selectedCompany ? <>
      {!activeReport ? <>
        <div className="reports-v16-toolbar"><div><strong>Prévia interna</strong><span>Sem registro persistente</span><span>{readiness?.required_days ? `${Math.max(0, readiness.collected_days)} de ${readiness.required_days} dias de coleta` : 'Dados lidos em tempo real'}</span>{readiness && !readiness.can_generate_official ? <span className="reports-v17-official-wait">Fechamento oficial liberado {readiness.available_on ? `em ${new Date(`${String(readiness.available_on).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}` : `após ${readiness.required_days} dias de coleta`}</span> : null}{error ? <span className="reports-v17-toolbar-error" role="alert">{error}</span> : null}</div><div><Button variant="secondary" type="button" disabled={saving} onClick={() => void loadPeriod(companyId, reportType, periodStart, periodEnd)}><RefreshCw size={15} />Atualizar prévia</Button><Button variant="secondary" type="button" onClick={() => setPreviewOpen(true)}><FileText size={15} />Visualizar prévia</Button><Button variant="primary" type="button" disabled={saving || Boolean(readiness && !readiness.can_generate_official)} onClick={() => void createOfficialClosing()}><CheckCircle2 size={15} />Criar fechamento oficial</Button></div></div>
        <section className="reports-v16-review-map"><div><span>PRÉVIA SEM PERSISTÊNCIA</span><h2>Navegar pelo período não cria mais rascunho.</h2><p>{readiness && !readiness.can_generate_official ? `A coleta mínima ainda não foi atingida. O fechamento oficial ficará disponível a partir de ${formatDate(readiness.available_on)}.` : 'Os dados podem ser conferidos e a curadoria pode ser preparada agora. O registro oficial só será criado por ação explícita.'}</p></div><div className="reports-v16-review-stats"><article><strong>{reviewCounts?.facts || 0}</strong><span>fontes automáticas</span></article><article><strong>{periodDeliveries.length}</strong><span>entregas no período</span></article><article><strong>{changes.length}</strong><span>comparativos com base</span></article></div></section>
        <main className="reports-v16-workspace">
          <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>01</span><div><h2>Base da prévia</h2><p>Identificação e fatos são lidos da origem, sem gravar relatório.</p></div></div><dl className="reports-v16-identification"><div><dt>Cliente</dt><dd>{selectedCompany.name}</dd></div><div><dt>Período</dt><dd>{periodName}</dd></div><div><dt>Projeto / ciclo</dt><dd>{snapshot.cycleContext?.projectName || kpis?.cycleLabel || snapshot.projects[0]?.name || '—'}</dd></div><div><dt>Protocolo</dt><dd>Será gerado no fechamento</dd></div></dl></section>
          <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>02</span><div><h2>Fatos disponíveis</h2><p>Só aparece o que possui base real no período.</p></div></div><div className="reports-v16-fact-grid">{hasCapacity ? <article><small>Capacidade utilizada</small><strong>{usagePercent === null ? formatHoursV14(usedMinutes) : `${usagePercent}%`}</strong></article> : null}{hasPlanned ? <article><small>Entregas previstas</small><strong>{kpis?.completedDeliveries}/{kpis?.plannedDeliveries}</strong></article> : null}{hasAdherence ? <article><small>Aderência ao prazo</small><strong>{kpis?.deliveryAdherence}%</strong></article> : null}</div>{periodDeliveries.length ? <div><h3>Planejado x realizado</h3><table className="reports-v16-table deliveries"><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{periodDeliveries.map((item) => <tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream ? <small>{item.workstream}</small> : null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table></div> : <p className="reports-v16-empty">Nenhum entregável movimentado neste período.</p>}</section>
          <ReportManualComplementsPanel value={manualComplements} onChange={setManualComplements} />
          {previewEditorial}
          {history}
        </main>
      </> : <>
        <div className="reports-v16-toolbar"><div><strong>{isSimulation ? 'Simulação interna' : statusLabel[lifecycleStatus]}</strong>{!isSimulation ? <span>v{activeReport.version}</span> : null}<span>{autosaveState === 'saving' ? 'Salvando…' : autosaveState === 'error' ? 'Falha no autosave' : `Salvo ${formatDateTime(lastSavedAt || activeReport.updatedAt)}`}</span></div><div>{canEdit ? <Button variant="secondary" type="button" disabled={saving} onClick={() => void refreshData()}><RefreshCw size={15} />{isSimulation ? 'Atualizar simulação' : 'Atualizar fatos'}</Button> : null}{['approved', 'sent', 'published'].includes(lifecycleStatus) ? <Button variant="secondary" type="button" disabled={saving} onClick={() => void createNewVersion()}><RotateCcw size={15} />{['sent', 'published'].includes(lifecycleStatus) ? 'Simular atualização' : 'Nova versão'}</Button> : null}<Button variant="secondary" type="button" onClick={() => setPreviewOpen(true)}><FileText size={15} />Visualizar relatório</Button>{primaryAction()}</div></div>

        <section className="reports-v16-review-map"><div><span>REVISÃO CALI</span><h2>{isSimulation ? 'Esta simulação não altera o fechamento enviado.' : 'O operacional já está fechado. Revise o que exige julgamento.'}</h2><p>Fatos permanecem bloqueados; decisões e direção só entram quando você as seleciona.</p></div><div className="reports-v16-review-stats"><article><strong>{reviewCounts?.facts || 0}</strong><span>fontes automáticas</span></article><article><strong>{reviewCounts?.editorial || 0}</strong><span>itens selecionados</span></article><article className={unresolvedBlocking.length ? 'attention' : ''}><strong>{reviewCounts?.alerts || 0}</strong><span>pontos para conferir</span></article></div></section>

        <main className="reports-v16-workspace">
          <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>01</span><div><h2>Base do fechamento</h2><p>Identificação automática. Nada aqui deve ser digitado no relatório.</p></div></div><dl className="reports-v16-identification"><div><dt>Cliente</dt><dd>{selectedCompany.name}</dd></div><div><dt>Período</dt><dd>{periodName}</dd></div><div><dt>Projeto / ciclo</dt><dd>{snapshot.cycleContext?.projectName || kpis?.cycleLabel || snapshot.projects[0]?.name || '—'}</dd></div><div><dt>Protocolo</dt><dd>{activeReport.protocol}</dd></div></dl></section>

          <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>02</span><div><h2>Fatos do período</h2><p>Indicadores sem base deixam de ocupar espaço.</p></div></div><div className="reports-v16-fact-grid">{hasCapacity ? <article><small>{extraMinutes > 0 ? 'Consumo no período' : 'Capacidade utilizada'}</small><strong>{usagePercent === null ? formatHoursV14(usedMinutes) : `${usagePercent}%`}</strong></article> : null}{hasPlanned ? <article><small>Entregas previstas</small><strong>{kpis?.completedDeliveries}/{kpis?.plannedDeliveries}</strong></article> : null}{hasAdherence ? <article><small>Aderência ao prazo</small><strong>{kpis?.deliveryAdherence}%</strong></article> : null}</div>{contractedMinutes > 0 ? <div className="reports-v16-usage-track"><span style={{ width: `${Math.min(100, Math.max(0, usagePercent || 0))}%` }} /></div> : null}{extraMinutes > 0 && capacitySignal?.message ? <p className="reports-v16-capacity-signal">{capacitySignal.message}</p> : null}<div className="reports-v16-facts-split" style={{ gridTemplateColumns: '1fr' }}><div><h3>Entregas e andamento</h3>{periodDeliveries.length ? <table className="reports-v16-table deliveries"><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{periodDeliveries.map((item) => <tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream ? <small>{item.workstream}</small> : null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table> : <p className="reports-v16-empty">Nenhum entregável movimentado neste período.</p>}</div></div></section>

          <ReportManualComplementsPanel value={manualComplements} onChange={setManualComplements} locked={!canEdit} />

          {changes.length ? <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>03</span><div><h2>{reportType === 'quarterly' ? 'Evolução dentro do trimestre' : 'O que mudou'}</h2><p>Só existe comparativo quando há base real nos dois períodos.</p></div></div><div className="reports-v16-change-grid">{changes.map((item) => <article className={`tone-${item.tone}`} key={item.id}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}</div></section> : null}

          <section className="reports-v16-section"><div className="reports-v16-section-heading"><span>04</span><div><h2>Curadoria de demandas e decisões</h2><p>O Workspace sugere candidatos; nada é selecionado automaticamente para o documento.</p></div></div><div className="reports-v16-selection-grid"><div><h3>Demandas para leitura interna</h3>{demandChoices.length ? <div className="reports-v16-check-list">{demandChoices.map((item) => <label key={item}><input type="checkbox" disabled={!canEdit} checked={selectedDemands.has(item)} onChange={() => toggleSelection(item, 'movements')} /><span>{item}</span></label>)}</div> : <p className="reports-v16-empty">Nenhuma demanda estruturada foi registrada.</p>}</div><div><h3>Decisões registradas</h3>{decisionOptions.length ? <div className="reports-v16-check-list">{decisionOptions.map((item) => <label key={item}><input type="checkbox" disabled={!canEdit} checked={selectedDecisions.has(item)} onChange={() => toggleSelection(item, 'decisions')} /><span>{item}</span></label>)}</div> : <p className="reports-v16-empty">Nenhuma decisão estruturada foi registrada.</p>}</div></div></section>

          <section className="reports-v16-section reports-v16-alert-section"><div className="reports-v16-section-heading"><span>05</span><div><h2>Conferência antes da aprovação</h2><p>{unresolvedAlerts.length ? `${unresolvedAlerts.length} ponto(s) merecem conferência antes de fechar.` : 'Nenhuma pendência aberta.'}</p></div></div>{unresolvedAlerts.length ? <div className="reports-v16-alert-list">{unresolvedAlerts.map((alert) => { const dismissed = dismissedAlerts.find((item) => item.id === alert.id); return <article key={alert.id} className={dismissed ? 'tone-dismissed' : alert.blocking || alert.severity === 'critical' ? 'tone-critical' : 'tone-attention'}><div><strong>{dismissed ? 'Ignorado' : alert.blocking ? 'Precisa corrigir' : 'Atenção'}</strong><span><b>{alert.title}</b><p>{alert.detail}</p>{dismissed ? <small>Ignorado: {dismissed.reason}</small> : null}</span></div><div>{alert.actionHref ? <a href={alert.actionHref}>{alert.actionLabel || 'Ver origem'}</a> : null}{dismissed ? <button type="button" disabled={!canEdit} onClick={() => restoreAlert(alert.id)}>Restaurar</button> : <button type="button" disabled={!canEdit} onClick={() => { setDismissTarget(alert); setDismissReason(''); }}>Ignorar com justificativa</button>}</div></article>; })}</div> : <div className="reports-v16-ok"><CheckCircle2 size={18} />Os fatos estão consistentes para o fechamento.</div>}</section>

          <section className="reports-v16-section reports-v16-editorial"><div className="reports-v16-section-heading"><span>06</span><div><h2>Leitura executiva CALI</h2><p>Interprete o período sem repetir números, entregas ou mensagens brutas.</p></div></div><EditorialField title={reportType === 'quarterly' ? 'Leitura executiva do trimestre' : 'Leitura executiva do mês'} value={editor.summary} onChange={(value) => setEditor((current) => ({ ...current, summary: value }))} helper="3–5 linhas. Explique o que o período revela; não copie logs, dúvidas ou tabelas." rows={7} locked={!canEdit} /><EditorialField title="Pontos de atenção para o cliente" value={editor.risks} onChange={(value) => setEditor((current) => ({ ...current, risks: value }))} helper="Até 3 pontos. Traga risco + recomendação + dependência, sem repetir o texto da leitura executiva." rows={5} locked={!canEdit} /></section>

          <section className="reports-v16-section reports-v16-editorial"><div className="reports-v16-section-heading"><span>07</span><div><h2>{reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : 'Prioridades do próximo ciclo'}</h2><p>Feche olhando para frente. Prioridade não repete ponto de atenção.</p></div></div><EditorialField title="Prioridades" value={editor.nextSteps} onChange={(value) => setEditor((current) => ({ ...current, nextSteps: value }))} helper="1–3 movimentos. Inclua prazo, responsável ou dependência quando isso mudar a leitura." rows={5} locked={!canEdit} /></section>

          <details className="reports-v16-internal"><summary>Adicionar nota interna</summary><p>Visível somente para você. Não aparece no PDF, Workspace ou e-mail do cliente.</p><textarea rows={4} readOnly={!canEdit} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Anotação para a conversa ou para o próximo fechamento." /></details>
          {history}
        </main>
      </>}
    </> : null}

    {dismissTarget ? <div className="modal-backdrop workspace-modal-backdrop reports-v16-modal-backdrop"><DialogFrame className="modal-card reports-v16-small-modal" aria-label="Dispensar alerta"><Button variant="close" type="button" onClick={() => setDismissTarget(null)}><X size={19} /></Button><span className="section-kicker">JUSTIFICATIVA INTERNA</span><h2>Ignorar este alerta?</h2><p><strong>{dismissTarget.title}</strong></p><textarea autoFocus rows={4} value={dismissReason} onChange={(event) => setDismissReason(event.target.value)} placeholder="Registre por que este ponto não impede o fechamento." /><footer><Button variant="secondary" type="button" onClick={() => setDismissTarget(null)}>Cancelar</Button><Button variant="primary" type="button" disabled={!dismissReason.trim()} onClick={dismissAlert}>Confirmar justificativa</Button></footer></DialogFrame></div> : null}

    {sendOpen && activeReport ? <div className="modal-backdrop workspace-modal-backdrop reports-v16-modal-backdrop"><DialogFrame className="modal-card reports-v16-send-modal" aria-label="Enviar relatório"><Button variant="close" type="button" onClick={() => setSendOpen(false)}><X size={19} /></Button><span className="section-kicker">ENVIAR AO CLIENTE</span><h2>Relatório aprovado · v{activeReport.version}</h2><p>Ao confirmar, esta versão congelada ficará disponível em Relatórios no Workspace do cliente e os destinatários receberão a notificação por e-mail.</p><div className="reports-v16-send-channels"><label><input type="checkbox" checked readOnly />Disponibilizar no Workspace</label><label><input type="checkbox" checked readOnly />Enviar notificação por e-mail</label></div><label><span>Destinatários</span><input type="text" value={sendRecipients} onChange={(event) => setSendRecipients(event.target.value)} placeholder="email@cliente.com, outro@cliente.com" /></label><label><span>Mensagem opcional</span><textarea rows={4} value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} placeholder="Uma observação curta antes do acesso ao relatório." /></label>{sendError && <InlineNotice tone="danger" role="alert">{sendError}</InlineNotice>}<footer><Button variant="secondary" type="button" disabled={sending} onClick={() => setSendOpen(false)}>Cancelar</Button><Button variant="primary" type="button" disabled={sending || !sendRecipients.trim()} onClick={() => void sendReport()}>{sending ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}Enviar relatório</Button></footer></DialogFrame></div> : null}

    {previewOpen && snapshot && selectedCompany ? <div className="modal-backdrop workspace-modal-backdrop reports-v16-preview-backdrop"><DialogFrame className="modal-card reports-v16-preview-modal" aria-label="Prévia do relatório"><div className="reports-v16-preview-toolbar"><div><strong>{activeReport ? 'Prévia da versão congelável' : 'Prévia interna sem persistência'}</strong><span>{selectedCompany.name} · {periodName}{activeReport ? ` · v${activeReport.version}` : ''}</span></div><div><Button variant="secondary" type="button" onClick={() => setPreviewOpen(false)}><X size={16} />Voltar</Button>{activeReport ? <Button variant="secondary" type="button" onClick={openPrint}><Printer size={16} />Baixar / imprimir PDF</Button> : null}{activeReport?.status === 'review' && !isSimulation ? <Button variant="primary" type="button" onClick={() => void approveReport()}><CheckCircle2 size={16} />Aprovar relatório</Button> : activeReport?.status === 'approved' ? <Button variant="primary" type="button" onClick={() => void openSend()}><Send size={16} />Enviar ao cliente</Button> : null}</div></div><div className="reports-v16-preview-document"><WorkspaceExecutiveReportPaper company={selectedCompany} snapshot={attachReportManualComplements(snapshot, manualComplements)} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol || '—'} deliveries={deliveries} /></div></DialogFrame></div> : null}
  </section></div></div></Shell>;
}
