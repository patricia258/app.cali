import { ReportPeriodChanges } from './components/ReportPeriodChanges';
import { ReportReviewChecklist } from './components/ReportReviewChecklist';
import { ReportEditorWorkspace } from './components/ReportEditorWorkspace';
import { ReportReviewOverview } from './components/ReportReviewOverview';
import { ReportEditorToolbar } from './components/ReportEditorToolbar';
import { CorrectDeliveredReportDialog } from './components/CorrectDeliveredReportDialog';
import { useOpenReportRevision } from './hooks/useOpenReportRevision';
import { useWithdrawableReports } from './hooks/useWithdrawableReports';
import type { WithdrawableReport } from '../../../api/reports/withdrawal';
import { ReportClientHistory } from './components/ReportClientHistory';
import { ReportVersionHistory } from './components/ReportVersionHistory';
import { ReportSectionHeading } from './components/ReportSectionHeading';
import { ReportReviewSection } from './components/ReportReviewSection';
import { ReportReviewAlerts } from './components/ReportReviewAlerts';
import { ReportWorkflowConfirmation, type ReportWorkflowAction } from './components/ReportWorkflowConfirmation';
import { useOfficialTrackedReport } from './hooks/useOfficialTrackedReport';
import { useMarkLegacyReportSimulation } from './hooks/useMarkLegacyReportSimulation';
import { isJsonObject, type JsonValue } from '../../../domain/json';
import { confirmAction } from '../../../components/feedback/workspaceDialogs';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useAdminReportDeepLink } from './hooks/useAdminReportDeepLink';
import { AdminMaterialReview } from '../../material-review/AdminMaterialReview';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, FileText, Loader2, Mail, Printer, RefreshCw, RotateCcw, Send, X } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { WorkspaceExecutiveReportPaper } from '../../../components/reports/WorkspaceExecutiveReportPaper';
import { ReportManualComplementsPanel } from './components/ReportManualComplementsPanel';
import {
  approveExecutiveReport, createReportDraft, deleteReportDraft, deliverExecutiveReport, readCurrentReportPeriod,
  readFreshReportPeriod, readReportPortfolio, readReportReadiness, readReportRecipients, refreshReportFacts,
  saveReportEditorialDraft, startReportReview, type FreshPeriodData, type ReportReadiness, type AdminReportRow,
} from '../../../api/reports/admin';
import { endOfMonth, endOfQuarter, format, startOfMonth, startOfQuarter } from 'date-fns';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { reportTypeLabel, type ReportEditor, type ReportType } from '../../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../../lib/reportIntelligence';
import { deliveryRowsForPdf, deliveryTimingLabelV14, formatHoursV14, isAlertDismissed, periodLabelV14, reportKpisV14, type DeliveryPerformanceRow, type DismissedReportAlert, type ReportCloseAlert, type ReportLifecycleStatus } from '../../../lib/reportCloseMetrics';
import { buildReportAlertsV15, capacitySignalV15 } from '../../../lib/reportCapacityAndAlerts';
import { reportReviewCountsV16 } from '../../../lib/reportReviewAndFeedback';
import { buildEditorialSeedV17, decisionCandidatesV17, demandCandidatesV17, periodChangeSignalsV17 } from '../../../lib/reportEditorial';
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
  clientOpenCount: number;
  acknowledgedAt?: string | null;
  workflowMode?: 'official' | 'simulation';
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
function dismissedFrom(value: JsonValue | undefined): DismissedReportAlert[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isJsonObject(item) || !item.id || !item.reason) return [];
    return [{
      id: String(item.id), reason: String(item.reason),
      dismissedAt: String(item.dismissedAt || item.dismissed_at || new Date().toISOString()),
    }];
  });
}
function reportRow(row: AdminReportRow): Report {
  const workflowMode = isJsonObject(row.source_snapshot) ? row.source_snapshot.workflow_mode : undefined;
  return {
    id: row.id, companyId: row.company_id, title: row.title, reportType: row.report_type || 'monthly',
    periodStart: String(row.period_start || row.reference_month).slice(0, 10),
    periodEnd: String(row.period_end || row.reference_month).slice(0, 10),
    status: row.status, summary: row.executive_summary || '',
    movements: Array.isArray(row.movements) ? row.movements.map(String) : [],
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String) : [],
    risks: Array.isArray(row.risks) ? row.risks.map(String) : [],
    nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String) : [],
    snapshot: normalizeIntelligenceSnapshot(row.source_snapshot), protocol: row.protocol || '—',
    updatedAt: row.updated_at, version: Number(row.version || 1), revisionParentId: row.revision_parent_id,
    dismissedAlerts: dismissedFrom(row.dismissed_alerts), internalNote: row.internal_note || '',
    dataRefreshedAt: row.data_refreshed_at, reviewStartedAt: row.review_started_at, approvedAt: row.approved_at,
    sentAt: row.sent_at, sentTo: Array.isArray(row.sent_to) ? row.sent_to.map(String) : [],
    clientOpenCount: Number(row.client_open_count || 0), acknowledgedAt: row.acknowledged_at,
    workflowMode: workflowMode === 'simulation' || workflowMode === 'official' ? workflowMode : undefined,
  };
}
function editorFrom(report: Report): ReportEditor { return { summary: report.summary, movements: report.movements.join('\n'), decisions: report.decisions.join('\n'), risks: report.risks.join('\n'), nextSteps: report.nextSteps.join('\n') }; }
function frozenDeliveryRows(snapshot: IntelligenceSnapshot | null) { return snapshot?.deliveryPerformanceV14 ?? null; }
function isSent(report: Report) { return report.status === 'sent' || report.status === 'published'; }
function isDraft(report: Report) { return report.status === 'draft' || report.status === 'review'; }
function matchesPeriod(report: Report, companyId: string, type: ReportType, start: string, end: string) {
  return report.companyId === companyId && report.reportType === type && report.periodStart === start && report.periodEnd === end;
}

function EditorialField({ title, value, onChange, helper, rows = 5, locked }: { title: string; value: string; onChange: (value: string) => void; helper: string; rows?: number; locked: boolean }) {
  return <div className="reports-v16-editor-field tw:grid tw:grid-cols-[16.25rem_minmax(0,1fr)] tw:gap-[1.84615rem] tw:border-t
    tw:border-solid tw:border-[#eee7e2] tw:py-[1.30769rem] tw:first-of-type:border-t-0 tw:first-of-type:pt-0
    tw:max-[680px]:grid-cols-1 tw:workspace-night:border-[#3d3034]"><div><h3 className="tw:mx-0 tw:mt-0 tw:mb-[0.3125rem] tw:text-[0.8125rem] tw:workspace-night:text-[#f5efec]">{title}</h3><p className="tw:m-0 tw:text-[0.625rem] tw:leading-normal tw:text-[#8a7d76] tw:workspace-night:text-[#b6a8a3]">{helper}</p></div><textarea className="tw:w-full tw:resize-y tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e2d9d3] tw:bg-white
    tw:px-[0.8125rem] tw:py-3 tw:text-[0.71875rem] tw:leading-[1.55] tw:text-cali-ink tw:outline-none
    tw:focus:border-[#9e6875] tw:focus:shadow-[0_0_0_0.1875rem_#5a1e2d0f] tw:read-only:bg-[#f7f4f1]
    tw:read-only:text-[#6d625c] tw:workspace-night:border-[#4b3940] tw:workspace-night:bg-[#2a2024]
    tw:workspace-night:text-[#f3ece9] tw:workspace-night:read-only:bg-[#241c1f] tw:workspace-night:read-only:text-[#b8aaa5]" rows={rows} value={value} readOnly={locked} onChange={(event) => onChange(event.target.value)} /></div>;
}

export function AdminReportsPage() {
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
  const deepLinkedReport = useAdminReportDeepLink();
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<WithdrawableReport | null>(null);
  const [workflowAction, setWorkflowAction] = useState<ReportWorkflowAction | null>(null);
  const openReportRevision = useOpenReportRevision();
  const handledDeepLink = useRef('');
  const { data: withdrawableReports } = useWithdrawableReports();
  const withdrawableById = useMemo(() => new Map((withdrawableReports ?? [])
    .filter((report) => !report.withdrawn_at)
    .map((report) => [report.id, report])), [withdrawableReports]);
  const toolbarCorrectionTarget = activeReport ? withdrawableById.get(activeReport.id) : undefined;
  const { data: trackedReport } = useOfficialTrackedReport(activeReport?.protocol);
  const { mutate: markLegacySimulation } = useMarkLegacyReportSimulation();
  const lastSavedPayload = useRef('');
  const periodRequest = useRef(0);

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
  const periodOfficial = companyReports.find((report) => isSent(report) && matchesPeriod(report, companyId, reportType, periodStart, periodEnd));
  const officialReportId = readiness?.official_report_id || periodOfficial?.id;
  const isSimulation = Boolean(activeReport && (activeReport.workflowMode === 'simulation' || (isDraft(activeReport) && officialReportId && activeReport.id !== officialReportId)));
  const isCollectionPreview = Boolean(activeReport && isDraft(activeReport) && !isSimulation && readiness?.mode === 'preview');
  const canEdit = !activeReport || isDraft(activeReport);
  const canApprove = !isSimulation && !isCollectionPreview && (!readiness || readiness.can_generate_official);
  const canSend = !isSimulation && (!readiness || readiness.can_send);
  const createsSimulation = Boolean(activeReport && (isSent(activeReport) || (officialReportId && officialReportId !== activeReport.id)));
  const lifecycleStatus = activeReport?.status || 'draft';

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => {
    if (!deepLinkedReport) {
      handledDeepLink.current = '';
      return;
    }
    if (handledDeepLink.current === deepLinkedReport) return;
    const target = reports.find((report) => report.id === deepLinkedReport);
    if (!target) return;
    handledDeepLink.current = deepLinkedReport;
    setCompanyId(target.companyId);
    setReportType(target.reportType);
    setPeriodStart(target.periodStart);
    setPeriodEnd(target.periodEnd);
  }, [deepLinkedReport, reports]);
  useEffect(() => {
    if (companyId && periodStart && periodEnd) void loadPeriod(companyId, reportType, periodStart, periodEnd);
    return () => { periodRequest.current += 1; };
  }, [companyId, reportType, periodStart, periodEnd]);
  useEffect(() => { if (!previewOpen && !dismissTarget && !sendOpen && !historyOpen && !correctionTarget && !workflowAction) return; document.body.classList.add('workspace-modal-open'); return () => document.body.classList.remove('workspace-modal-open'); }, [previewOpen, dismissTarget, sendOpen, historyOpen, correctionTarget, workflowAction]);
  useEffect(() => {
    if (!activeReport || !canEdit) return;
    const payload = JSON.stringify({ summary: editor.summary, movements: editor.movements, decisions: editor.decisions, risks: editor.risks, nextSteps: editor.nextSteps, internalNote, dismissedAlerts, manualComplements });
    if (payload === lastSavedPayload.current) return;
    setAutosaveState('saving');
    const timer = window.setTimeout(async () => {
      try {
        const nextSnapshot = snapshot || activeReport.snapshot;
        await saveReportEditorialDraft(activeReport.id, {
          editor, internalNote, dismissedAlerts,
          snapshot: nextSnapshot ? attachReportManualComplements(withWorkflowMode(nextSnapshot), manualComplements) : null,
        });
      } catch (reason) {
        setAutosaveState('error');
        setError(`Autosave: ${reason instanceof Error ? reason.message : 'Não foi possível salvar.'}`);
        return;
      }
      lastSavedPayload.current = payload; setAutosaveState('saved'); setLastSavedAt(new Date().toISOString());
    }, 850);
    return () => window.clearTimeout(timer);
  }, [activeReport?.id, canEdit, editor, internalNote, dismissedAlerts, manualComplements, snapshot, isSimulation, officialReportId]);

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
        handledDeepLink.current = requested.id;
        setCompanyId(requested.companyId);
        setReportType(requested.reportType);
        setPeriodStart(requested.periodStart);
        setPeriodEnd(requested.periodEnd);
      } else if (!companyId && nextCompanies.length) setCompanyId(nextCompanies[0].id);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar Relatórios.'); }
    finally { setLoadingBase(false); }
  }

  async function refreshReportViews() {
    await loadBase();
    if (companyId && periodStart && periodEnd) await loadPeriod(companyId, reportType, periodStart, periodEnd);
  }

  async function createDraft(fresh: FreshPeriodData, version = 1, parentId: string | null = null, mode: 'official' | 'simulation' = 'official', initialEditor?: ReportEditor, initialInternalNote = '', initialManual: ReportManualComplements = emptyReportManualComplements()) {
    if (!selectedCompany) throw new Error('Cliente não selecionado.');
    const seed = buildEditorialSeedV17(fresh.snapshot, reportType);
    const sourceSnapshot = attachReportManualComplements({ ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: mode, ...(mode === 'simulation' ? { simulation_of: parentId, simulation_marked_at: new Date().toISOString() } : {}) } satisfies IntelligenceSnapshot, initialManual);
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
    const request = ++periodRequest.current;
    setLoadingPeriod(true); setError(''); setNotice(''); setAutosaveState('idle');
    try {
      const [fresh, nextReadiness, reportResult] = await Promise.all([
        readFreshReportPeriod(nextCompanyId, nextType, nextStart, nextEnd),
        readReportReadiness(nextCompanyId, nextType, nextStart, nextEnd),
        readCurrentReportPeriod(nextCompanyId, nextType, nextStart, nextEnd),
      ]);
      if (periodRequest.current !== request) return;
      setLiveSnapshot(fresh.snapshot); setReadiness(nextReadiness);

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
      const delivered = nextReadiness?.official_report_id || reports.find((item) => isSent(item) && matchesPeriod(item, nextCompanyId, nextType, nextStart, nextEnd))?.id;
      if (delivered && delivered !== report.id && isDraft(report) && report.workflowMode !== 'simulation') {
        markLegacySimulation({ report: reportResult, officialId: delivered });
      }
      const frozen = frozenDeliveryRows(savedSnapshot);
      const useFrozen = ['approved', 'sent', 'published'].includes(report.status) && frozen;
      const savedManual = reportManualComplementsFromSnapshot(savedSnapshot);
      setActiveReport(report); setSnapshot(savedSnapshot); setDeliveries(useFrozen ? frozen! : fresh.deliveries); setEditor(editorFrom(report)); setManualComplements(savedManual); setInternalNote(report.internalNote); setDismissedAlerts(report.dismissedAlerts); setLastSavedAt(report.updatedAt);
      lastSavedPayload.current = JSON.stringify({ summary: report.summary, movements: report.movements.join('\n'), decisions: report.decisions.join('\n'), risks: report.risks.join('\n'), nextSteps: report.nextSteps.join('\n'), internalNote: report.internalNote, dismissedAlerts: report.dismissedAlerts, manualComplements: savedManual });
    } catch (requestError) {
      if (periodRequest.current !== request) return;
      setSnapshot(null); setLiveSnapshot(null); setDeliveries([]); setActiveReport(null); setEditor(emptyEditor); setManualComplements(emptyReportManualComplements()); setReadiness(null); setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o fechamento.');
    } finally { if (periodRequest.current === request) setLoadingPeriod(false); }
  }

  function changeType(next: ReportType) { setReportType(next); const anchor = new Date(`${periodStart}T12:00:00`), period = next === 'monthly' ? monthlyPeriod(anchor) : quarterlyPeriod(anchor); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function changeMonth(value: string) { const [year, month] = value.split('-').map(Number), period = monthlyPeriod(new Date(year, month - 1, 1)); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function changeQuarter(value: string) { const period = quarterPeriod(value); setPeriodStart(period.start); setPeriodEnd(period.end); }
  function toggleSelection(value: string, kind: 'decisions' | 'movements') { if (!canEdit) return; const current = new Set(lines(editor[kind])); if (current.has(value)) current.delete(value); else current.add(value); setEditor((state) => ({ ...state, [kind]: Array.from(current).join('\n') })); }

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

  function withWorkflowMode(value: IntelligenceSnapshot): IntelligenceSnapshot {
    if (!isSimulation) return value;
    return {
      ...value,
      workflow_mode: 'simulation',
      simulation_of: value.simulation_of || officialReportId || null,
      simulation_marked_at: value.simulation_marked_at || new Date().toISOString(),
    };
  }

  async function refreshData() {
    if (!canEdit || saving) return;
    const request = periodRequest.current;
    setSaving(true); setError('');
    try {
      const [fresh, nextReadiness] = await Promise.all([
        readFreshReportPeriod(companyId, reportType, periodStart, periodEnd),
        readReportReadiness(companyId, reportType, periodStart, periodEnd),
      ]);
      if (periodRequest.current !== request) return;
      const refreshed = withWorkflowMode({ ...activeReport?.snapshot, ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries });
      if (activeReport) {
        const sourceSnapshot = attachReportManualComplements({ ...refreshed, workflow_mode: refreshed.workflow_mode || 'official' }, manualComplements);
        await refreshReportFacts(activeReport.id, sourceSnapshot, {
          serviceType: fresh.snapshot.contract.serviceType || selectedCompany?.serviceType || null,
          servicePlan: fresh.snapshot.contract.servicePlan || selectedCompany?.servicePlan || null,
          contractedHours: fresh.snapshot.contract.contractedHoursPeriod,
        });
        if (periodRequest.current !== request) return;
        setActiveReport({ ...activeReport, snapshot: sourceSnapshot, workflowMode: sourceSnapshot.workflow_mode });
      }
      setReadiness(nextReadiness);
      setSnapshot(refreshed);
      setLiveSnapshot(fresh.snapshot);
      setDeliveries(fresh.deliveries);
      setNotice('Dados automáticos atualizados. Sua curadoria editorial foi preservada.');
      if (activeReport) await loadBase();
    } catch (requestError) {
      if (periodRequest.current === request) setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar os dados.');
    }
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
    if (!canApprove) { setError('A aprovação fica disponível após o período mínimo de coleta.'); return; }
    if (!editor.summary.trim()) { setError('A leitura executiva precisa estar preenchida antes da aprovação.'); return; }
    if (unresolvedBlocking.length) { setError(`Existem ${unresolvedBlocking.length} item(ns) que precisam ser corrigidos antes da aprovação.`); return; }
    setSaving(true); setError('');
    try {
      const sourceSnapshot = attachReportManualComplements({ ...snapshot, deliveryPerformanceV14: deliveries, workflow_mode: 'official' } satisfies IntelligenceSnapshot, manualComplements);
      await approveExecutiveReport(activeReport.id, activeReport.version, {
        companyId, type: reportType, start: periodStart, end: periodEnd,
      }, { editor, internalNote, dismissedAlerts, snapshot: sourceSnapshot });
      setNotice('Relatório aprovado e congelado. A próxima ação é enviar ao cliente.'); await loadBase(); await loadPeriod(companyId, reportType, periodStart, periodEnd);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível aprovar o relatório.'); }
    finally { setSaving(false); }
  }

  async function openSend() {
    if (!activeReport) return;
    if (activeReport.status === 'approved' && !canSend) return;
    setSendMessage(''); setSendError(''); setError('');
    const recipients = await readReportRecipients(companyId).catch(() => []);
    setSendRecipients(recipients.join(', '));
    setSendOpen(true);
  }

  async function sendReport() {
    if (!activeReport || sending || !['approved', 'sent', 'published'].includes(activeReport.status)) return;
    if (activeReport.status === 'approved' && !canSend) return;
    const recipients = sendRecipients.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
    if (!recipients.length) { setSendError('Informe pelo menos um e-mail de destinatário.'); return; }
    const requestId = await confirmDelivery(recipients, [activeReport.id, activeReport.version, sendMessage]);
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
    if (!activeReport || !liveSnapshot || saving || !['approved', 'sent', 'published'].includes(activeReport.status)) return;
    setSaving(true); setError('');
    try {
      const fresh = await readFreshReportPeriod(companyId, reportType, periodStart, periodEnd);
      const simulation = createsSimulation;
      await createDraft(fresh, activeReport.version + 1, activeReport.id, simulation ? 'simulation' : 'official', undefined, '', manualComplements);
      setNotice(simulation ? 'Simulação interna criada. Ela não altera nem substitui a versão enviada ao cliente.' : `Versão ${activeReport.version + 1} criada como novo rascunho.`);
      await loadBase(); await loadPeriod(companyId, reportType, periodStart, periodEnd);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar a nova versão.'); }
    finally { setSaving(false); }
  }

  function confirmWorkflowAction() {
    const action = workflowAction;
    setWorkflowAction(null);
    if (action === 'create-simulation') void createNewVersion();
    else if (action) void refreshData();
  }

  async function deleteReport(report: Report) {
    if (!['draft', 'review'].includes(report.status)) return;
    const ok = await confirmAction(`Excluir definitivamente ${periodLabelV14(report.reportType, report.periodStart)} · v${report.version}?`); if (!ok) return;
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
    if (activeReport.status === 'review') return <Button variant="primary" type="button" disabled={saving || !canApprove} onClick={() => void approveReport()}><CheckCircle2 size={16} />Aprovar relatório</Button>;
    if (activeReport.status === 'approved') return <Button variant="primary" type="button" disabled={saving || !canSend} onClick={() => void openSend()}><Send size={16} />Enviar ao cliente</Button>;
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

  function correctionButton(reportId: string) {
    const report = withdrawableById.get(reportId);
    return report && (
      <button type="button" title="Abrir revisão para correção" className="tw:cursor-pointer tw:rounded-lg tw:border-0 tw:bg-transparent tw:px-2 tw:py-1 tw:font-bold tw:text-cali-brand
        tw:hover:bg-cali-gold/10 tw:workspace-night:text-cali-gold" onClick={() => setCorrectionTarget(report)}>Corrigir</button>
    );
  }

  const history = <ReportVersionHistory
    reports={companyReports.slice(0, 12).map((report) => ({
      ...report,
      isSimulation: report.workflowMode === 'simulation' || (isDraft(report) && companyReports.some((item) =>
        isSent(item) && matchesPeriod(item, report.companyId, report.reportType, report.periodStart, report.periodEnd))),
    }))}
    activeReportId={activeReport?.id}
    statusLabel={statusLabel}
    formatDateTime={formatDateTime}
    onSelect={(report) => { setReportType(report.reportType); setPeriodStart(report.periodStart); setPeriodEnd(report.periodEnd); }}
    onDelete={(id) => {
      const report = companyReports.find((item) => item.id === id);
      if (report) void deleteReport(report);
    }}
    renderCorrection={correctionButton}
  />;

  const previewEditorial = <>
    {changes.length ? <ReportReviewSection><ReportSectionHeading number="03" title={reportType === 'quarterly' ? 'Evolução dentro do trimestre' : 'O que mudou'} description={'Só existe comparativo quando há base real nos dois períodos.'} /><ReportPeriodChanges changes={changes} /></ReportReviewSection> : null}
    <ReportReviewSection><ReportSectionHeading number="04" title={'Curadoria de demandas e decisões'} description={'Você pode preparar a curadoria agora. Nada é gravado até criar o fechamento oficial.'} /><div className="reports-v16-selection-grid tw:grid tw:grid-cols-2 tw:gap-[2.61538rem] tw:max-[1050px]:grid-cols-1
      tw:[&_h3]:mt-0! tw:[&_h3]:text-[#3a322e] tw:workspace-night:[&_h3]:text-[#f5efec]"><div><h3>Demandas para leitura interna</h3>{demandChoices.length ? <ReportReviewChecklist>{demandChoices.map((item) => <label key={item}><input type="checkbox" checked={selectedDemands.has(item)} onChange={() => toggleSelection(item, 'movements')} /><span>{item}</span></label>)}</ReportReviewChecklist> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhuma demanda estruturada foi registrada.</p>}</div><div><h3>Decisões registradas</h3>{decisionOptions.length ? <ReportReviewChecklist>{decisionOptions.map((item) => <label key={item}><input type="checkbox" checked={selectedDecisions.has(item)} onChange={() => toggleSelection(item, 'decisions')} /><span>{item}</span></label>)}</ReportReviewChecklist> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhuma decisão estruturada foi registrada.</p>}</div></div></ReportReviewSection>
    <ReportReviewAlerts alerts={unresolvedAlerts} />
    <ReportReviewSection surface="editorial"><ReportSectionHeading number="06" title={'Leitura executiva CALI'} description={'Estes campos continuam editáveis antes do fechamento. O conteúdo será levado para a versão oficial quando você criá-la.'} /><EditorialField title={reportType === 'quarterly' ? 'Leitura executiva do trimestre' : 'Leitura executiva do mês'} value={editor.summary} onChange={(value) => setEditor((current) => ({ ...current, summary: value }))} helper="3–5 linhas. Explique o que o período revela; não copie logs, dúvidas ou tabelas." rows={7} locked={false} /><EditorialField title="Pontos de atenção para o cliente" value={editor.risks} onChange={(value) => setEditor((current) => ({ ...current, risks: value }))} helper="Até 3 pontos. Traga risco + recomendação + dependência, sem repetir o texto da leitura executiva." rows={5} locked={false} /></ReportReviewSection>
    <ReportReviewSection surface="editorial"><ReportSectionHeading number="07" title={reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : 'Prioridades do próximo ciclo'} description={'Feche olhando para frente. Prioridade não repete ponto de atenção.'} /><EditorialField title="Prioridades" value={editor.nextSteps} onChange={(value) => setEditor((current) => ({ ...current, nextSteps: value }))} helper="1–3 movimentos. Inclua prazo, responsável ou dependência quando isso mudar a leitura." rows={5} locked={false} /></ReportReviewSection>
    <details className="reports-v16-internal tw:group tw:border-t tw:border-solid tw:border-[#ece5df] tw:bg-[#faf7f4]
      tw:px-[2.46154rem] tw:py-[1.38462rem] tw:max-[680px]:px-[1.38462rem] tw:workspace-night:border-[#3b2d32]
      tw:workspace-night:bg-[#1d1719]"><summary className="tw:cursor-pointer tw:list-none tw:text-[0.84615rem] tw:font-extrabold tw:text-cali-brand tw:before:mr-[0.61538rem]
      tw:before:inline-block tw:before:text-[1.23077rem] tw:before:leading-[1.5] tw:before:font-normal
      tw:before:content-['+'] tw:group-open:before:content-['−'] tw:[&::-webkit-details-marker]:hidden
      tw:workspace-night:text-[#e4b9c3]">Adicionar nota interna</summary><p className="tw:mt-2 tw:mb-2.5 tw:text-[0.625rem] tw:text-[#887b75]">Visível somente para você. A nota só passa a ser gravada quando o fechamento oficial for criado.</p><textarea className="tw:w-full tw:resize-y tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e2d9d3] tw:bg-white
      tw:px-[0.8125rem] tw:py-3 tw:text-[0.71875rem] tw:leading-[1.55] tw:text-cali-ink tw:outline-none
      tw:focus:border-[#9e6875] tw:focus:shadow-[0_0_0_0.1875rem_#5a1e2d0f] tw:read-only:bg-[#f7f4f1]
      tw:read-only:text-[#6d625c] tw:workspace-night:border-[#4b3940] tw:workspace-night:bg-[#2a2024]
      tw:workspace-night:text-[#f3ece9] tw:workspace-night:read-only:bg-[#241c1f] tw:workspace-night:read-only:text-[#b8aaa5]" rows={4} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Anotação para a conversa ou para o próximo fechamento." /></details>
  </>;

  // Trilha do fechamento: mostra em que etapa o relatório do período está.
  const stageIndex = !activeReport ? 0 : isSimulation ? 1 : ['sent', 'published'].includes(lifecycleStatus) ? 3 : lifecycleStatus === 'approved' ? 2 : 1;
  const stages = ['Prévia interna', isSimulation ? 'Simulação interna' : 'Fechamento em revisão', 'Aprovado', 'Enviado ao cliente'];
  const canOpenDistinctPreview = activeReport && isDraft(activeReport) && !isSimulation;
  const collectionWait = readiness && !readiness.can_generate_official && !officialReportId
    ? `Fechamento oficial liberado ${readiness.available_on ? `em ${formatDate(readiness.available_on)}` : `após ${readiness.required_days} dias de coleta`}`
    : null;

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-reports v2-client-module"><div className="ap-content"><section className="wf reports-admin-v16 tw:mx-auto tw:max-w-[98.46154rem] tw:pb-[5.84615rem] tw:[&>.inline-notice:not(.success)]:border!
    tw:[&>.inline-notice:not(.success)]:border-solid! tw:[&>.inline-notice:not(.success)]:border-[#d7c6bd]!
    tw:[&>.inline-notice:not(.success)]:bg-cali-day-canvas! tw:[&>.inline-notice:not(.success)]:text-cali-brand!
    tw:[&>.inline-notice:not(.success)_svg]:text-[#8b4855]! tw:max-[680px]:px-0 tw:[&_:is(strong,b,span,h1,h2,h3,dd,dt,small,p,td,th,button,label,input,select,textarea)]:[font-family:Inter,system-ui,sans-serif]!">
    {activeReport && isDraft(activeReport) && !isSimulation && <AdminMaterialReview kind="report" entityId={activeReport.id} companyId={activeReport.companyId} onApproved={refreshReportViews} />}
    <div className="wf-head tw:items-start"><div><small>BACKOFFICE / CALI RH</small><h1>Relatórios</h1><p>Fechamento executivo de cada conta: fatos do período, curadoria, leitura da CALI, aprovação e envio ao cliente.</p></div></div>
    <div className="wf-controls v2-report-controls tw:mb-[1.23077rem] tw:flex tw:flex-wrap! tw:items-center tw:justify-between tw:gap-x-[1.23077rem] tw:gap-y-[0.92308rem]"><ol className="v2-report-stages tw:m-0 tw:flex tw:min-w-0 tw:flex-none tw:list-none tw:items-center tw:gap-0 tw:p-0 tw:max-[1180px]:flex-wrap tw:max-[1180px]:gap-y-[0.61538rem]" aria-label="Etapa do fechamento">{stages.map((label, index) => <li key={label} className={`tw:inline-flex tw:items-center tw:gap-[0.61538rem] tw:text-[0.84615rem] tw:whitespace-nowrap tw:text-[#a8938f] tw:[&+li]:before:mx-[0.61538rem] tw:[&+li]:before:h-px tw:[&+li]:before:w-[1.38462rem] tw:[&+li]:before:bg-[#e2d5cb] tw:[&+li]:before:content-[''] ${index < stageIndex ? 'done tw:text-[#31805a]' : index === stageIndex ? 'current tw:font-bold tw:text-[#322f2c]' : ''}`}>
      <b className={`tw:grid tw:size-[1.375rem] tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:text-[0.625rem] tw:font-bold ${index < stageIndex ? 'tw:border-[#cfe9da] tw:bg-[#e6f6ec] tw:text-[#31805a]' : index === stageIndex ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#e2d5cb] tw:bg-white tw:text-[#a8938f]'}`}>{index + 1}</b><span>{label}</span></li>)}</ol><div className="reports-v16-filters tw:my-0! tw:ml-auto! tw:flex! tw:flex-none tw:flex-wrap tw:items-center tw:justify-end
        tw:gap-[0.76923rem] tw:p-0! tw:max-[1050px]:justify-start tw:max-[680px]:w-full tw:[&_label]:m-0!
        tw:[&_label]:inline-flex! tw:[&_label]:flex-row! tw:[&_label]:items-center tw:[&_label]:gap-[0.53846rem]
        tw:[&_label]:text-[0.76923rem]! tw:[&_label]:font-bold! tw:[&_label]:tracking-normal! tw:[&_label]:text-[#6f625c]
        tw:[&_label]:normal-case! tw:[&_:is(select,input)]:h-[2.76923rem]! tw:[&_:is(select,input)]:min-h-0!
        tw:[&_:is(select,input)]:w-auto tw:[&_:is(select,input)]:min-w-[11.38462rem] tw:[&_:is(select,input)]:max-w-[16.92308rem]
        tw:[&_:is(select,input)]:rounded-[0.53846rem]! tw:[&_:is(select,input)]:border! tw:[&_:is(select,input)]:border-solid!
        tw:[&_:is(select,input)]:border-[#e5d9d0]! tw:[&_:is(select,input)]:bg-white! tw:[&_:is(select,input)]:px-[0.76923rem]!
        tw:[&_:is(select,input)]:py-0! tw:[&_:is(select,input)]:text-[0.84615rem]! tw:[&_:is(select,input)]:font-semibold!
        tw:[&_:is(select,input)]:text-[#322f2c]! tw:[&_:is(select,input)]:normal-case tw:[&_label:first-child_select]:min-w-[17.69231rem]"><label>Empresa<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label><label>Tipo<select value={reportType} onChange={(event) => changeType(event.target.value as ReportType)}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select></label>{reportType === 'monthly' ? <label>Período<input type="month" value={periodStart.slice(0, 7)} onChange={(event) => changeMonth(event.target.value)} /></label> : <label>Período<select value={quarterKey(periodStart)} onChange={(event) => changeQuarter(event.target.value)}>{quarters.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}</div></div>
    {notice ? <InlineNotice tone="success"><CheckCircle2 size={18} />{notice}</InlineNotice> : null}{error ? <InlineNotice><AlertTriangle size={18} />{error}</InlineNotice> : null}

    {loadingPeriod ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Lendo {periodName}…</div> : snapshot && selectedCompany ? <>
      {!activeReport ? <>
        <ReportEditorToolbar><div><strong>Prévia interna</strong><span>Sem registro persistente</span><span>{readiness?.required_days ? `${Math.max(0, readiness.collected_days)} de ${readiness.required_days} dias de coleta` : 'Dados lidos em tempo real'}</span>{collectionWait && <span className="reports-v17-official-wait tw:font-semibold tw:text-[#9a6b1f]!">{collectionWait}</span>}{error ? <span className="reports-v17-toolbar-error tw:font-semibold tw:text-[#b42318]!" role="alert">{error}</span> : null}</div><div><Button variant="secondary" type="button" disabled={saving} onClick={() => setWorkflowAction('refresh-preview')}><RefreshCw size={15} />Atualizar prévia</Button><Button variant="secondary" type="button" onClick={() => setPreviewOpen(true)}><FileText size={15} />Visualizar prévia</Button><Button variant="primary" type="button" disabled={saving || Boolean(readiness && !readiness.can_generate_official)} onClick={() => void createOfficialClosing()}><CheckCircle2 size={15} />Criar fechamento oficial</Button></div></ReportEditorToolbar>
        <ReportReviewOverview
          label="PRÉVIA SEM PERSISTÊNCIA"
          title="Navegar pelo período não cria mais rascunho."
          description={readiness && !readiness.can_generate_official
            ? `A coleta mínima ainda não foi atingida. O fechamento oficial ficará disponível a partir de ${formatDate(readiness.available_on)}.`
            : 'Os dados podem ser conferidos e a curadoria pode ser preparada agora. O registro oficial só será criado por ação explícita.'}
          metrics={[
            { value: reviewCounts?.facts || 0, label: 'fontes automáticas' },
            { value: periodDeliveries.length, label: 'entregas no período' },
            { value: changes.length, label: 'comparativos com base' },
          ]}
        />
        <ReportEditorWorkspace>
          <ReportReviewSection><ReportSectionHeading number="01" title={'Base da prévia'} description={'Identificação e fatos são lidos da origem, sem gravar relatório.'} /><dl className="reports-v16-identification tw:m-0 tw:grid tw:grid-cols-4 tw:border-y tw:border-solid tw:border-[#eee7e2]
            tw:max-[680px]:grid-cols-2 tw:workspace-night:border-[#433339] tw:[&>div]:mr-[1.38462rem] tw:[&>div]:border-r
            tw:[&>div]:border-solid tw:[&>div]:border-[#eee7e2] tw:[&>div]:pt-[1.15385rem] tw:[&>div]:pr-[1.38462rem]
            tw:[&>div]:pb-[1.07692rem] tw:[&>div:last-child]:mr-0 tw:[&>div:last-child]:border-r-0 tw:[&_dt]:mb-[0.38462rem]
            tw:[&_dt]:text-[0.69231rem] tw:[&_dt]:font-extrabold tw:[&_dt]:tracking-[0.1em] tw:[&_dt]:text-[#978982]
            tw:[&_dt]:uppercase tw:[&_dd]:m-0 tw:[&_dd]:text-[1.07692rem] tw:[&_dd]:leading-[calc(1.25/0.875)]
            tw:[&_dd]:leading-[1.35] tw:[&_dd]:font-bold tw:[&_dd]:text-[#312c29] tw:workspace-night:[&>div]:border-[#433339]
            tw:workspace-night:[&_dt]:text-[#aa9994] tw:workspace-night:[&_dd]:text-[#f5efec]"><div><dt>Cliente</dt><dd>{selectedCompany.name}</dd></div><div><dt>Período</dt><dd>{periodName}</dd></div><div><dt>Projeto / ciclo</dt><dd>{snapshot.cycleContext?.projectName || kpis?.cycleLabel || snapshot.projects[0]?.name || '—'}</dd></div><div><dt>Protocolo</dt><dd>Será gerado no fechamento</dd></div></dl></ReportReviewSection>
          <ReportReviewSection><ReportSectionHeading number="02" title={'Fatos disponíveis'} description={'Só aparece o que possui base real no período.'} /><div className="reports-v16-fact-grid tw:grid tw:grid-cols-5 tw:border-y tw:border-solid tw:border-[#eee7e2] tw:max-[1050px]:grid-cols-3
            tw:max-[680px]:grid-cols-2 tw:workspace-night:border-[#433339] tw:[&_article]:mr-[1.38462rem]
            tw:[&_article]:border-r tw:[&_article]:border-solid tw:[&_article]:border-[#eee7e2] tw:[&_article]:pt-[1.23077rem]
            tw:[&_article]:pr-[1.38462rem] tw:[&_article]:pb-[1.15385rem] tw:[&_article:last-child]:mr-0 tw:[&_article:last-child]:border-r-0
            tw:[&_small]:block tw:[&_small]:text-[0.65385rem] tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.09em]
            tw:[&_small]:text-[#95867f] tw:[&_small]:uppercase tw:[&_strong]:mt-[0.38462rem] tw:[&_strong]:block
            tw:[&_strong]:text-[1.69231rem]! tw:[&_strong]:font-semibold! tw:[&_strong]:text-cali-brand! tw:workspace-night:[&_article]:border-[#433339]
            tw:workspace-night:[&_small]:text-[#aa9994]">{hasCapacity ? <article><small>Capacidade utilizada</small><strong>{usagePercent === null ? formatHoursV14(usedMinutes) : `${usagePercent}%`}</strong></article> : null}{hasPlanned ? <article><small>Entregas previstas</small><strong>{kpis?.completedDeliveries}/{kpis?.plannedDeliveries}</strong></article> : null}{hasAdherence ? <article><small>Aderência ao prazo</small><strong>{kpis?.deliveryAdherence}%</strong></article> : null}</div>{periodDeliveries.length ? <div><h3>Planejado x realizado</h3><table className="reports-v16-table deliveries tw:w-full tw:border-collapse tw:[&_th]:border-b tw:[&_th]:border-solid
            tw:[&_th]:border-[#d9d0ca] tw:[&_th]:py-[0.53846rem] tw:[&_th]:pr-[0.69231rem] tw:[&_th]:text-left
            tw:[&_th]:text-[0.65385rem] tw:[&_th]:font-extrabold tw:[&_th]:tracking-[0.08em] tw:[&_th]:text-[#8a7d76]
            tw:[&_th]:uppercase tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-[#eee7e2] tw:[&_td]:py-[0.69231rem]
            tw:[&_td]:pr-[0.69231rem] tw:[&_td]:align-top tw:[&_td]:text-[0.84615rem] tw:[&_td]:text-[#3a3430]
            tw:[&_tr:last-child_td]:border-b-0 tw:[&_th:last-child]:pr-0 tw:[&_td:last-child]:pr-0 tw:[&_td:last-child]:text-left
            tw:[&_td_strong]:block tw:[&_td_strong]:text-[0.84615rem] tw:[&_td_small]:mt-[0.15385rem] tw:[&_td_small]:block
            tw:[&_td_small]:text-[0.69231rem] tw:[&_td_small]:text-[#8c7e77] tw:workspace-night:[&_th]:border-[#3d3034]
            tw:workspace-night:[&_td]:border-[#3d3034] tw:workspace-night:[&_th]:text-[#a99a95] tw:workspace-night:[&_td]:text-[#e8dfdc]
            tw:workspace-night:[&_td_small]:text-[#a99a95]"><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{periodDeliveries.map((item) => <tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream ? <small>{item.workstream}</small> : null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table></div> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhum entregável movimentado neste período.</p>}</ReportReviewSection>
          <ReportManualComplementsPanel value={manualComplements} onChange={setManualComplements} />
          {previewEditorial}
          {history}
        </ReportEditorWorkspace>
      </> : <>
        <ReportEditorToolbar>
          <div>
            {!isSimulation && <strong>{isCollectionPreview ? 'Prévia interna' : statusLabel[lifecycleStatus]}</strong>}
            {!isSimulation && !isCollectionPreview && <span>v{activeReport.version}</span>}
            <span>{autosaveState === 'saving' ? 'Salvando…' : autosaveState === 'error' ? 'Falha no autosave' : `Salvo ${formatDateTime(lastSavedAt || activeReport.updatedAt)}`}</span>
            {isCollectionPreview && collectionWait && <span className="reports-v17-official-wait tw:font-semibold tw:text-[#9a6b1f]!">{collectionWait}</span>}
          </div>
          <div>
            {canEdit && <Button variant="secondary" type="button" disabled={saving} onClick={() => setWorkflowAction(isSimulation ? 'refresh-simulation' : isCollectionPreview ? 'refresh-preview' : 'refresh-facts')}>
              <RefreshCw size={15} />{isSimulation ? 'Atualizar simulação' : isCollectionPreview ? 'Atualizar prévia' : 'Atualizar fatos'}
            </Button>}
            {['approved', 'sent', 'published'].includes(lifecycleStatus) && <Button variant="secondary" type="button" disabled={saving} onClick={() => createsSimulation ? setWorkflowAction('create-simulation') : void createNewVersion()}>
              <RotateCcw size={15} />{createsSimulation ? 'Simular atualização' : 'Nova versão'}
            </Button>}
            {canOpenDistinctPreview && <Button variant="secondary" type="button" onClick={() => setPreviewOpen(true)}><FileText size={15} />Visualizar relatório</Button>}
            {primaryAction()}
            {toolbarCorrectionTarget && <Button variant="secondary" type="button" title="Abrir revisão para correção" onClick={() => setCorrectionTarget(toolbarCorrectionTarget)}>Corrigir</Button>}
            {trackedReport && (
              <>
                <Button variant="secondary" type="button" onClick={() => window.open(`/admin/relatorios/impressao/${encodeURIComponent(trackedReport.id)}`, '_blank', 'noopener,noreferrer')}>Ver versão enviada</Button>
                <Button variant="secondary" type="button" onClick={() => setHistoryOpen(true)}>Histórico do cliente</Button>
              </>
            )}
          </div>
        </ReportEditorToolbar>

        <ReportReviewOverview
          label="REVISÃO CALI"
          title={isSimulation ? 'Esta simulação não altera o fechamento enviado.' : 'O operacional já está fechado. Revise o que exige julgamento.'}
          description="Fatos permanecem bloqueados; decisões e direção só entram quando você as seleciona."
          metrics={[
            { value: reviewCounts?.facts || 0, label: 'fontes automáticas' },
            { value: reviewCounts?.editorial || 0, label: 'itens selecionados' },
            { value: reviewCounts?.alerts || 0, label: 'pontos para conferir', attention: Boolean(unresolvedBlocking.length) },
          ]}
        />

        <ReportEditorWorkspace>
          <ReportReviewSection><ReportSectionHeading number="01" title={'Base do fechamento'} description={'Identificação automática. Nada aqui deve ser digitado no relatório.'} /><dl className="reports-v16-identification tw:m-0 tw:grid tw:grid-cols-4 tw:border-y tw:border-solid tw:border-[#eee7e2]
            tw:max-[680px]:grid-cols-2 tw:workspace-night:border-[#433339] tw:[&>div]:mr-[1.38462rem] tw:[&>div]:border-r
            tw:[&>div]:border-solid tw:[&>div]:border-[#eee7e2] tw:[&>div]:pt-[1.15385rem] tw:[&>div]:pr-[1.38462rem]
            tw:[&>div]:pb-[1.07692rem] tw:[&>div:last-child]:mr-0 tw:[&>div:last-child]:border-r-0 tw:[&_dt]:mb-[0.38462rem]
            tw:[&_dt]:text-[0.69231rem] tw:[&_dt]:font-extrabold tw:[&_dt]:tracking-[0.1em] tw:[&_dt]:text-[#978982]
            tw:[&_dt]:uppercase tw:[&_dd]:m-0 tw:[&_dd]:text-[1.07692rem] tw:[&_dd]:leading-[calc(1.25/0.875)]
            tw:[&_dd]:leading-[1.35] tw:[&_dd]:font-bold tw:[&_dd]:text-[#312c29] tw:workspace-night:[&>div]:border-[#433339]
            tw:workspace-night:[&_dt]:text-[#aa9994] tw:workspace-night:[&_dd]:text-[#f5efec]"><div><dt>Cliente</dt><dd>{selectedCompany.name}</dd></div><div><dt>Período</dt><dd>{periodName}</dd></div><div><dt>Projeto / ciclo</dt><dd>{snapshot.cycleContext?.projectName || kpis?.cycleLabel || snapshot.projects[0]?.name || '—'}</dd></div><div><dt>Protocolo</dt><dd>{activeReport.protocol}</dd></div></dl></ReportReviewSection>

          <ReportReviewSection><ReportSectionHeading number="02" title={'Fatos do período'} description={'Indicadores sem base deixam de ocupar espaço.'} /><div className="reports-v16-fact-grid tw:grid tw:grid-cols-5 tw:border-y tw:border-solid tw:border-[#eee7e2] tw:max-[1050px]:grid-cols-3
            tw:max-[680px]:grid-cols-2 tw:workspace-night:border-[#433339] tw:[&_article]:mr-[1.38462rem]
            tw:[&_article]:border-r tw:[&_article]:border-solid tw:[&_article]:border-[#eee7e2] tw:[&_article]:pt-[1.23077rem]
            tw:[&_article]:pr-[1.38462rem] tw:[&_article]:pb-[1.15385rem] tw:[&_article:last-child]:mr-0 tw:[&_article:last-child]:border-r-0
            tw:[&_small]:block tw:[&_small]:text-[0.65385rem] tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.09em]
            tw:[&_small]:text-[#95867f] tw:[&_small]:uppercase tw:[&_strong]:mt-[0.38462rem] tw:[&_strong]:block
            tw:[&_strong]:text-[1.69231rem]! tw:[&_strong]:font-semibold! tw:[&_strong]:text-cali-brand! tw:workspace-night:[&_article]:border-[#433339]
            tw:workspace-night:[&_small]:text-[#aa9994]">{hasCapacity ? <article><small>{extraMinutes > 0 ? 'Consumo no período' : 'Capacidade utilizada'}</small><strong>{usagePercent === null ? formatHoursV14(usedMinutes) : `${usagePercent}%`}</strong></article> : null}{hasPlanned ? <article><small>Entregas previstas</small><strong>{kpis?.completedDeliveries}/{kpis?.plannedDeliveries}</strong></article> : null}{hasAdherence ? <article><small>Aderência ao prazo</small><strong>{kpis?.deliveryAdherence}%</strong></article> : null}</div>{contractedMinutes > 0 ? <div className="reports-v16-usage-track tw:mt-[1.15385rem] tw:mb-[0.61538rem] tw:h-[0.46154rem] tw:overflow-hidden
            tw:rounded-full tw:bg-[#eee7e2] tw:workspace-night:bg-[#3b2e32] tw:[&>span]:block tw:[&>span]:h-full
            tw:[&>span]:rounded-[inherit] tw:[&>span]:bg-cali-gold"><span style={{ width: `${Math.min(100, Math.max(0, usagePercent || 0))}%` }} /></div> : null}{extraMinutes > 0 && capacitySignal?.message ? <p className="reports-v16-capacity-signal tw:mt-[0.76923rem] tw:mb-[1.23077rem] tw:border-l-[0.23077rem] tw:border-solid
            tw:border-cali-gold tw:py-[0.76923rem] tw:pl-[1.07692rem] tw:text-[0.84615rem] tw:leading-normal
            tw:text-[#5f554f] tw:workspace-night:text-[#b8aaa5]">{capacitySignal.message}</p> : null}<div className="reports-v16-facts-split tw:mt-[1.38462rem] tw:grid tw:grid-cols-1 tw:gap-[2.30769rem] tw:[&_h3]:text-[#3a322e] tw:workspace-night:[&_h3]:text-[#f5efec]"><div><h3>Entregas e andamento</h3>{periodDeliveries.length ? <table className="reports-v16-table deliveries tw:w-full tw:border-collapse tw:[&_th]:border-b tw:[&_th]:border-solid
            tw:[&_th]:border-[#d9d0ca] tw:[&_th]:py-[0.53846rem] tw:[&_th]:pr-[0.69231rem] tw:[&_th]:text-left
            tw:[&_th]:text-[0.65385rem] tw:[&_th]:font-extrabold tw:[&_th]:tracking-[0.08em] tw:[&_th]:text-[#8a7d76]
            tw:[&_th]:uppercase tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-[#eee7e2] tw:[&_td]:py-[0.69231rem]
            tw:[&_td]:pr-[0.69231rem] tw:[&_td]:align-top tw:[&_td]:text-[0.84615rem] tw:[&_td]:text-[#3a3430]
            tw:[&_tr:last-child_td]:border-b-0 tw:[&_th:last-child]:pr-0 tw:[&_td:last-child]:pr-0 tw:[&_td:last-child]:text-left
            tw:[&_td_strong]:block tw:[&_td_strong]:text-[0.84615rem] tw:[&_td_small]:mt-[0.15385rem] tw:[&_td_small]:block
            tw:[&_td_small]:text-[0.69231rem] tw:[&_td_small]:text-[#8c7e77] tw:workspace-night:[&_th]:border-[#3d3034]
            tw:workspace-night:[&_td]:border-[#3d3034] tw:workspace-night:[&_th]:text-[#a99a95] tw:workspace-night:[&_td]:text-[#e8dfdc]
            tw:workspace-night:[&_td_small]:text-[#a99a95]"><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>{periodDeliveries.map((item) => <tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream ? <small>{item.workstream}</small> : null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}</tbody></table> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhum entregável movimentado neste período.</p>}</div></div></ReportReviewSection>

          <ReportManualComplementsPanel value={manualComplements} onChange={setManualComplements} locked={!canEdit} />

          {changes.length ? <ReportReviewSection><ReportSectionHeading number="03" title={reportType === 'quarterly' ? 'Evolução dentro do trimestre' : 'O que mudou'} description={'Só existe comparativo quando há base real nos dois períodos.'} /><ReportPeriodChanges changes={changes} /></ReportReviewSection> : null}

          <ReportReviewSection><ReportSectionHeading number="04" title={'Curadoria de demandas e decisões'} description={'O Workspace sugere candidatos; nada é selecionado automaticamente para o documento.'} /><div className="reports-v16-selection-grid tw:grid tw:grid-cols-2 tw:gap-[2.61538rem] tw:max-[1050px]:grid-cols-1
            tw:[&_h3]:mt-0! tw:[&_h3]:text-[#3a322e] tw:workspace-night:[&_h3]:text-[#f5efec]"><div><h3>Demandas para leitura interna</h3>{demandChoices.length ? <ReportReviewChecklist>{demandChoices.map((item) => <label key={item}><input type="checkbox" disabled={!canEdit} checked={selectedDemands.has(item)} onChange={() => toggleSelection(item, 'movements')} /><span>{item}</span></label>)}</ReportReviewChecklist> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhuma demanda estruturada foi registrada.</p>}</div><div><h3>Decisões registradas</h3>{decisionOptions.length ? <ReportReviewChecklist>{decisionOptions.map((item) => <label key={item}><input type="checkbox" disabled={!canEdit} checked={selectedDecisions.has(item)} onChange={() => toggleSelection(item, 'decisions')} /><span>{item}</span></label>)}</ReportReviewChecklist> : <p className="reports-v16-empty tw:m-0 tw:text-[0.82055rem] tw:text-[#8a7d76]">Nenhuma decisão estruturada foi registrada.</p>}</div></div></ReportReviewSection>

          <ReportReviewAlerts
            alerts={unresolvedAlerts}
            dismissedAlerts={dismissedAlerts}
            locked={!canEdit}
            onDismiss={(alert) => { setDismissTarget(alert); setDismissReason(''); }}
            onRestore={restoreAlert}
          />

          <ReportReviewSection surface="editorial"><ReportSectionHeading number="06" title={'Leitura executiva CALI'} description={'Interprete o período sem repetir números, entregas ou mensagens brutas.'} /><EditorialField title={reportType === 'quarterly' ? 'Leitura executiva do trimestre' : 'Leitura executiva do mês'} value={editor.summary} onChange={(value) => setEditor((current) => ({ ...current, summary: value }))} helper="3–5 linhas. Explique o que o período revela; não copie logs, dúvidas ou tabelas." rows={7} locked={!canEdit} /><EditorialField title="Pontos de atenção para o cliente" value={editor.risks} onChange={(value) => setEditor((current) => ({ ...current, risks: value }))} helper="Até 3 pontos. Traga risco + recomendação + dependência, sem repetir o texto da leitura executiva." rows={5} locked={!canEdit} /></ReportReviewSection>

          <ReportReviewSection surface="editorial"><ReportSectionHeading number="07" title={reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : 'Prioridades do próximo ciclo'} description={'Feche olhando para frente. Prioridade não repete ponto de atenção.'} /><EditorialField title="Prioridades" value={editor.nextSteps} onChange={(value) => setEditor((current) => ({ ...current, nextSteps: value }))} helper="1–3 movimentos. Inclua prazo, responsável ou dependência quando isso mudar a leitura." rows={5} locked={!canEdit} /></ReportReviewSection>

          <details className="reports-v16-internal tw:group tw:border-t tw:border-solid tw:border-[#ece5df] tw:bg-[#faf7f4]
            tw:px-[2.46154rem] tw:py-[1.38462rem] tw:max-[680px]:px-[1.38462rem] tw:workspace-night:border-[#3b2d32]
            tw:workspace-night:bg-[#1d1719]"><summary className="tw:cursor-pointer tw:list-none tw:text-[0.84615rem] tw:font-extrabold tw:text-cali-brand tw:before:mr-[0.61538rem]
            tw:before:inline-block tw:before:text-[1.23077rem] tw:before:leading-[1.5] tw:before:font-normal
            tw:before:content-['+'] tw:group-open:before:content-['−'] tw:[&::-webkit-details-marker]:hidden
            tw:workspace-night:text-[#e4b9c3]">Adicionar nota interna</summary><p className="tw:mt-2 tw:mb-2.5 tw:text-[0.625rem] tw:text-[#887b75]">Visível somente para você. Não aparece no PDF, Workspace ou e-mail do cliente.</p><textarea className="tw:w-full tw:resize-y tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e2d9d3] tw:bg-white
            tw:px-[0.8125rem] tw:py-3 tw:text-[0.71875rem] tw:leading-[1.55] tw:text-cali-ink tw:outline-none
            tw:focus:border-[#9e6875] tw:focus:shadow-[0_0_0_0.1875rem_#5a1e2d0f] tw:read-only:bg-[#f7f4f1]
            tw:read-only:text-[#6d625c] tw:workspace-night:border-[#4b3940] tw:workspace-night:bg-[#2a2024]
            tw:workspace-night:text-[#f3ece9] tw:workspace-night:read-only:bg-[#241c1f] tw:workspace-night:read-only:text-[#b8aaa5]" rows={4} readOnly={!canEdit} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Anotação para a conversa ou para o próximo fechamento." /></details>
          {history}
        </ReportEditorWorkspace>
      </>}
    </> : null}

    {dismissTarget ? <div className="modal-backdrop workspace-modal-backdrop reports-v16-modal-backdrop tw:fixed tw:inset-0 tw:z-980
      tw:grid tw:place-items-center tw:bg-[#171017a8] tw:p-[1.38462rem] tw:backdrop-blur-sm"><DialogFrame className="modal-card reports-v16-small-modal tw:relative tw:flex tw:max-h-[92dvh] tw:w-[min(41.53846rem,100%)]
      tw:max-w-[43.84615rem] tw:flex-col tw:gap-[1rem] tw:overflow-y-auto tw:rounded-[1.07692rem] tw:border
      tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:p-[2rem] tw:text-[#322f2c] tw:[&_h2]:m-0
      tw:[&_h2]:text-[1.61538rem] tw:[&_h2]:leading-tight tw:[&_h2]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.92308rem]
      tw:[&_p]:leading-[calc(1/0.75)] tw:[&_p]:leading-normal tw:[&_p]:text-[#89796f] tw:[&_label]:flex
      tw:[&_label]:flex-col tw:[&_label]:gap-[0.53846rem] tw:[&_label]:text-[0.84615rem] tw:[&_label]:font-bold
      tw:[&_label]:text-[#67574c] tw:[&_footer]:mt-[0.30769rem] tw:[&_footer]:flex tw:[&_footer]:justify-end
      tw:[&_footer]:gap-[0.76923rem] tw:[&_:is(button.primary,button.secondary)]:inline-flex tw:[&_:is(button.primary,button.secondary)]:h-auto
      tw:[&_:is(button.primary,button.secondary)]:items-center tw:[&_:is(button.primary,button.secondary)]:justify-center
      tw:[&_:is(button.primary,button.secondary)]:gap-[0.53846rem] tw:[&_:is(button.primary,button.secondary)]:rounded-[0.53846rem]
      tw:[&_:is(button.primary,button.secondary)]:border tw:[&_:is(button.primary,button.secondary)]:border-solid
      tw:[&_button.secondary]:border-[#dec9c3] tw:[&_button.secondary]:bg-white tw:[&_button.secondary]:text-cali-brand
      tw:[&_button.primary]:border-cali-brand tw:[&_button.primary]:bg-cali-brand tw:[&_button.primary]:text-white
      tw:[&_:is(button.primary,button.secondary)]:px-[1.07692rem] tw:[&_:is(button.primary,button.secondary)]:py-[0.76923rem]
      tw:[&_:is(button.primary,button.secondary)]:text-[0.84615rem] tw:[&_:is(button.primary,button.secondary)]:font-bold
      tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-45" aria-label="Dispensar alerta"><Button className="tw:absolute tw:top-4 tw:right-4 tw:grid tw:size-8 tw:place-items-center tw:rounded-[0.4375rem]
      tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:p-0 tw:text-cali-brand" variant="close" type="button" onClick={() => setDismissTarget(null)}><X size={19} /></Button><span className="section-kicker tw:block tw:text-[0.5625rem] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold">JUSTIFICATIVA INTERNA</span><h2>Ignorar este alerta?</h2><p><strong>{dismissTarget.title}</strong></p><textarea className="tw:box-border tw:w-full tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white
      tw:px-3 tw:text-xs tw:font-normal tw:text-[#322f2c] tw:resize-y tw:py-[0.6875rem]" autoFocus rows={4} value={dismissReason} onChange={(event) => setDismissReason(event.target.value)} placeholder="Registre por que este ponto não impede o fechamento." /><footer><Button variant="secondary" type="button" onClick={() => setDismissTarget(null)}>Cancelar</Button><Button variant="primary" type="button" disabled={!dismissReason.trim()} onClick={dismissAlert}>Confirmar justificativa</Button></footer></DialogFrame></div> : null}

    {sendOpen && activeReport ? <div className="modal-backdrop workspace-modal-backdrop reports-v16-modal-backdrop tw:fixed tw:inset-0 tw:z-980
      tw:grid tw:place-items-center tw:bg-[#171017a8] tw:p-[1.38462rem] tw:backdrop-blur-sm"><DialogFrame className="modal-card reports-v16-send-modal tw:relative tw:flex tw:max-h-[92dvh] tw:w-[min(41.53846rem,100%)]
      tw:max-w-[43.84615rem] tw:flex-col tw:gap-[1rem] tw:overflow-y-auto tw:rounded-[1.07692rem] tw:border
      tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:p-[2rem] tw:text-[#322f2c] tw:[&_h2]:m-0
      tw:[&_h2]:text-[1.61538rem] tw:[&_h2]:leading-tight tw:[&_h2]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-[0.92308rem]
      tw:[&_p]:leading-[calc(1/0.75)] tw:[&_p]:leading-normal tw:[&_p]:text-[#89796f] tw:[&_label]:flex
      tw:[&_label]:flex-col tw:[&_label]:gap-[0.53846rem] tw:[&_label]:text-[0.84615rem] tw:[&_label]:font-bold
      tw:[&_label]:text-[#67574c] tw:[&_footer]:mt-[0.30769rem] tw:[&_footer]:flex tw:[&_footer]:justify-end
      tw:[&_footer]:gap-[0.76923rem] tw:[&_:is(button.primary,button.secondary)]:inline-flex tw:[&_:is(button.primary,button.secondary)]:h-auto
      tw:[&_:is(button.primary,button.secondary)]:items-center tw:[&_:is(button.primary,button.secondary)]:justify-center
      tw:[&_:is(button.primary,button.secondary)]:gap-[0.53846rem] tw:[&_:is(button.primary,button.secondary)]:rounded-[0.53846rem]
      tw:[&_:is(button.primary,button.secondary)]:border tw:[&_:is(button.primary,button.secondary)]:border-solid
      tw:[&_button.secondary]:border-[#dec9c3] tw:[&_button.secondary]:bg-white tw:[&_button.secondary]:text-cali-brand
      tw:[&_button.primary]:border-cali-brand tw:[&_button.primary]:bg-cali-brand tw:[&_button.primary]:text-white
      tw:[&_:is(button.primary,button.secondary)]:px-[1.07692rem] tw:[&_:is(button.primary,button.secondary)]:py-[0.76923rem]
      tw:[&_:is(button.primary,button.secondary)]:text-[0.84615rem] tw:[&_:is(button.primary,button.secondary)]:font-bold
      tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-45" aria-label="Enviar relatório"><Button className="tw:absolute tw:top-4 tw:right-4 tw:grid tw:size-8 tw:place-items-center tw:rounded-[0.4375rem]
      tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:p-0 tw:text-cali-brand" variant="close" type="button" onClick={() => setSendOpen(false)}><X size={19} /></Button><span className="section-kicker tw:block tw:text-[0.5625rem] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold">ENVIAR AO CLIENTE</span><h2>Relatório aprovado · v{activeReport.version}</h2><p>Ao confirmar, esta versão congelada ficará disponível em Relatórios no Workspace do cliente e os destinatários receberão a notificação por e-mail.</p><div className="reports-v16-send-channels tw:mt-[1.23077rem] tw:mb-[0.15385rem] tw:flex tw:flex-wrap tw:gap-[0.76923rem]
      tw:border-y tw:border-solid tw:border-[#eee7e2] tw:py-[0.92308rem] tw:[&_label]:flex-row! tw:[&_label]:items-center
      tw:[&_label]:gap-[0.61538rem]! tw:[&_label]:rounded-[0.61538rem] tw:[&_label]:border tw:[&_label]:border-solid
      tw:[&_label]:border-[#efe7df] tw:[&_label]:bg-white tw:[&_label]:px-[0.92308rem] tw:[&_label]:py-[0.69231rem]
      tw:[&_label]:font-semibold! tw:[&_input]:m-0 tw:[&_input]:size-[1.15385rem] tw:[&_input]:accent-cali-brand"><label><input type="checkbox" checked readOnly />Disponibilizar no Workspace</label><label><input type="checkbox" checked readOnly />Enviar notificação por e-mail</label></div><label><span>Destinatários</span><input className="tw:box-border tw:w-full tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white
      tw:px-3 tw:text-xs tw:font-normal tw:text-[#322f2c] tw:h-10" type="text" value={sendRecipients} onChange={(event) => setSendRecipients(event.target.value)} placeholder="email@cliente.com, outro@cliente.com" /></label><label><span>Mensagem opcional</span><textarea className="tw:box-border tw:w-full tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white
      tw:px-3 tw:text-xs tw:font-normal tw:text-[#322f2c] tw:resize-y tw:py-[0.6875rem]" rows={4} value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} placeholder="Uma observação curta antes do acesso ao relatório." /></label>{sendError && <InlineNotice tone="danger" role="alert">{sendError}</InlineNotice>}<footer><Button variant="secondary" type="button" disabled={sending} onClick={() => setSendOpen(false)}>Cancelar</Button><Button variant="primary" type="button" disabled={sending || !sendRecipients.trim()} onClick={() => void sendReport()}>{sending ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}Enviar relatório</Button></footer></DialogFrame></div> : null}

    {workflowAction && <ReportWorkflowConfirmation action={workflowAction} onCancel={() => setWorkflowAction(null)} onConfirm={confirmWorkflowAction} />}
    {historyOpen && trackedReport && (
      <ReportClientHistory key={trackedReport.id} companyId={trackedReport.company_id} currentId={trackedReport.id} onClose={() => setHistoryOpen(false)} renderCorrection={correctionButton} />
    )}
    {correctionTarget && <CorrectDeliveredReportDialog
      key={correctionTarget.id}
      report={correctionTarget}
      onClose={() => setCorrectionTarget(null)}
      onCorrected={(revisionId) => {
        setCorrectionTarget(null);
        setHistoryOpen(false);
        if (revisionId) openReportRevision(revisionId);
        void refreshReportViews();
      }}
    />}
    {previewOpen && snapshot && selectedCompany ? <div className="modal-backdrop workspace-modal-backdrop reports-v16-preview-backdrop tw:fixed tw:inset-0 tw:z-980
      tw:grid tw:place-items-center tw:bg-[#171017a8] tw:p-[1.38462rem] tw:backdrop-blur-sm"><DialogFrame className="modal-card reports-v16-preview-modal tw:flex tw:h-[94dvh] tw:max-h-[94dvh] tw:w-[min(101.53846rem,100%)]
      tw:max-w-none tw:flex-col tw:overflow-hidden tw:rounded-[1.07692rem] tw:border tw:border-solid
      tw:border-[#e8ded6] tw:bg-white tw:p-0 tw:shadow-[0_1.5625rem_5.3125rem_#2418234a] tw:[&_:is(button.primary,button.secondary)]:inline-flex
      tw:[&_:is(button.primary,button.secondary)]:h-auto tw:[&_:is(button.primary,button.secondary)]:items-center
      tw:[&_:is(button.primary,button.secondary)]:justify-center tw:[&_:is(button.primary,button.secondary)]:gap-[0.53846rem]
      tw:[&_:is(button.primary,button.secondary)]:rounded-[0.53846rem] tw:[&_:is(button.primary,button.secondary)]:border
      tw:[&_:is(button.primary,button.secondary)]:border-solid tw:[&_button.secondary]:border-[#dec9c3]
      tw:[&_button.secondary]:bg-white tw:[&_button.secondary]:text-cali-brand tw:[&_button.primary]:border-cali-brand
      tw:[&_button.primary]:bg-cali-brand tw:[&_button.primary]:text-white tw:[&_:is(button.primary,button.secondary)]:px-[1.07692rem]
      tw:[&_:is(button.primary,button.secondary)]:py-[0.76923rem] tw:[&_:is(button.primary,button.secondary)]:text-[0.84615rem]
      tw:[&_:is(button.primary,button.secondary)]:font-bold tw:[&_button:disabled]:cursor-not-allowed
      tw:[&_button:disabled]:opacity-45" aria-label="Prévia do relatório"><div className="reports-v16-preview-toolbar tw:flex tw:h-[5.23077rem] tw:flex-none tw:flex-wrap tw:items-center
      tw:justify-between tw:gap-[1.07692rem] tw:border-b tw:border-solid tw:border-[#ded5d0]! tw:bg-white!
      tw:px-[1.69231rem] tw:py-[1.23077rem] tw:text-[0.92308rem] tw:leading-[calc(1/0.75)] tw:text-cali-ink!
      tw:max-[680px]:h-auto tw:max-[680px]:flex-col tw:max-[680px]:items-start tw:[&>div:first-child]:flex
      tw:[&>div:first-child]:min-w-0 tw:[&>div:first-child]:flex-col tw:[&>div:first-child]:gap-[0.30769rem]
      tw:[&_strong]:text-[1.15385rem] tw:[&_strong]:text-cali-brand! tw:[&_span]:text-[0.84615rem] tw:[&_span]:text-[#6a5f59]!
      tw:[&>div:last-child]:flex tw:[&>div:last-child]:flex-wrap tw:[&>div:last-child]:items-center
      tw:[&>div:last-child]:gap-[0.61538rem]"><div><strong>{activeReport ? 'Prévia da versão congelável' : 'Prévia interna sem persistência'}</strong><span>{selectedCompany.name} · {periodName}{activeReport ? ` · v${activeReport.version}` : ''}</span></div><div><Button variant="secondary" type="button" onClick={() => setPreviewOpen(false)}><X size={16} />Voltar</Button>{activeReport ? <Button variant="secondary" type="button" onClick={openPrint}><Printer size={16} />Baixar / imprimir PDF</Button> : null}{activeReport?.status === 'review' && !isSimulation ? <Button variant="primary" type="button" disabled={saving || !canApprove} onClick={() => void approveReport()}><CheckCircle2 size={16} />Aprovar relatório</Button> : activeReport?.status === 'approved' ? <Button variant="primary" type="button" disabled={saving || !canSend} onClick={() => void openSend()}><Send size={16} />Enviar ao cliente</Button> : null}</div></div><div className="reports-v16-preview-document tw:h-[calc(100%-5.23077rem)] tw:min-h-0 tw:flex-1 tw:overflow-auto
      tw:bg-[#d8d2cd] tw:px-[2.76923rem] tw:pt-[2.15385rem] tw:pb-[3.69231rem] tw:text-[1.02564rem]
      tw:[scrollbar-width:none] tw:[&::-webkit-scrollbar]:hidden tw:max-[680px]:h-[calc(100%-8.61538rem)]
      tw:max-[680px]:p-[1.07692rem] tw:[&_.reports-v16-paper_small]:text-[0.92308rem]! tw:[&_.reports-v16-paper_small]:leading-[calc(1/0.75)]!
      tw:[&_.reports-v16-paper_h1]:text-[2.23077rem]!"><WorkspaceExecutiveReportPaper company={selectedCompany} snapshot={attachReportManualComplements(snapshot, manualComplements)} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol || '—'} deliveries={deliveries} /></div></DialogFrame></div> : null}
  </section></div></div></Shell>;
}
