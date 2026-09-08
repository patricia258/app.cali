from pathlib import Path

ADMIN = Path('src/pages/admin/AdminReportsPageV17.tsx')
PAPER = Path('src/components/reports/ExecutiveReportPaperV17.tsx')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def patch_admin() -> None:
    text = ADMIN.read_text()

    text = replace_once(text,
        "import { ExecutiveReportPaperV17 } from '../../components/reports/ExecutiveReportPaperV17';\n",
        "import { ExecutiveReportPaperV17 } from '../../components/reports/ExecutiveReportPaperV17';\nimport { ReportManualComplementsPanel } from '../../components/reports/ReportManualComplementsPanel';\n",
        'admin import panel')
    text = replace_once(text,
        "import { buildEditorialSeedV17, decisionCandidatesV17, demandCandidatesV17, periodChangeSignalsV17 } from '../../lib/reportEditorialV17';\n",
        "import { buildEditorialSeedV17, decisionCandidatesV17, demandCandidatesV17, periodChangeSignalsV17 } from '../../lib/reportEditorialV17';\nimport { attachReportManualComplements, augmentReportData, emptyReportManualComplements, reportManualComplementsFromSnapshot, type ReportManualComplements } from '../../lib/reportManualComplements';\n",
        'admin import helper')

    text = replace_once(text,
        "  const [editor, setEditor] = useState<ReportEditor>(emptyEditor), [internalNote, setInternalNote] = useState(''), [dismissedAlerts, setDismissedAlerts] = useState<DismissedReportAlert[]>([]);\n",
        "  const [editor, setEditor] = useState<ReportEditor>(emptyEditor), [internalNote, setInternalNote] = useState(''), [dismissedAlerts, setDismissedAlerts] = useState<DismissedReportAlert[]>([]);\n  const [manualComplements, setManualComplements] = useState<ReportManualComplements>(emptyReportManualComplements());\n",
        'admin manual state')

    old_block = """  const alerts = useMemo(() => snapshot ? buildReportAlertsV15(snapshot, deliveries) : [], [snapshot, deliveries]);
  const unresolvedAlerts = useMemo(() => alerts.filter((item) => !isAlertDismissed(item, dismissedAlerts)), [alerts, dismissedAlerts]);
  const unresolvedBlocking = useMemo(() => unresolvedAlerts.filter((item) => item.blocking), [unresolvedAlerts]);
  const decisionOptions = useMemo(() => snapshot ? Array.from(new Set([...decisionCandidatesV17(snapshot), ...lines(editor.decisions)])) : [], [snapshot, editor.decisions]);
  const demandChoices = useMemo(() => snapshot ? Array.from(new Set([...demandCandidatesV17(snapshot), ...lines(editor.movements)])) : [], [snapshot, editor.movements]);
  const selectedDecisions = useMemo(() => new Set(lines(editor.decisions)), [editor.decisions]);
  const selectedDemands = useMemo(() => new Set(lines(editor.movements)), [editor.movements]);
  const kpis = useMemo(() => snapshot ? reportKpisV14(snapshot, deliveries) : null, [snapshot, deliveries]);
  const periodDeliveries = useMemo(() => snapshot ? deliveryRowsForPdf(snapshot, deliveries) : [], [snapshot, deliveries]);
  const capacitySignal = useMemo(() => snapshot ? capacitySignalV15(snapshot) : null, [snapshot]);
  const changes = useMemo(() => snapshot ? periodChangeSignalsV17(snapshot, reportType) : [], [snapshot, reportType]);
  const reviewCounts = useMemo(() => snapshot ? reportReviewCountsV16(snapshot, deliveries, selectedDemands.size, selectedDecisions.size, unresolvedAlerts.length) : null, [snapshot, deliveries, selectedDemands.size, selectedDecisions.size, unresolvedAlerts.length]);
"""
    new_block = """  const effectiveReportData = useMemo(() => snapshot ? augmentReportData(snapshot, deliveries, manualComplements) : null, [snapshot, deliveries, manualComplements]);
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
"""
    text = replace_once(text, old_block, new_block, 'admin effective data')

    text = replace_once(text,
        "    const payload = JSON.stringify({ summary: editor.summary, movements: editor.movements, decisions: editor.decisions, risks: editor.risks, nextSteps: editor.nextSteps, internalNote, dismissedAlerts });\n",
        "    const payload = JSON.stringify({ summary: editor.summary, movements: editor.movements, decisions: editor.decisions, risks: editor.risks, nextSteps: editor.nextSteps, internalNote, dismissedAlerts, manualComplements });\n",
        'admin autosave payload')
    text = replace_once(text,
        "      const result = await supabase.from('reports').update({ executive_summary: editor.summary, movements: lines(editor.movements), decisions: lines(editor.decisions), risks: lines(editor.risks), next_steps: lines(editor.nextSteps), internal_note: internalNote, dismissed_alerts: dismissedAlerts }).eq('id', activeReport.id);\n",
        "      const result = await supabase.from('reports').update({ executive_summary: editor.summary, movements: lines(editor.movements), decisions: lines(editor.decisions), risks: lines(editor.risks), next_steps: lines(editor.nextSteps), internal_note: internalNote, dismissed_alerts: dismissedAlerts, source_snapshot: snapshot ? attachReportManualComplements(snapshot, manualComplements) : activeReport.snapshot }).eq('id', activeReport.id);\n",
        'admin autosave source')
    text = replace_once(text,
        "  }, [activeReport?.id, canEdit, editor, internalNote, dismissedAlerts]);\n",
        "  }, [activeReport?.id, canEdit, editor, internalNote, dismissedAlerts, manualComplements, snapshot]);\n",
        'admin autosave deps')

    text = replace_once(text,
        "  async function createDraft(fresh: FreshPeriodData, version = 1, parentId: string | null = null, mode: 'official' | 'simulation' = 'official', initialEditor?: ReportEditor, initialInternalNote = '') {\n",
        "  async function createDraft(fresh: FreshPeriodData, version = 1, parentId: string | null = null, mode: 'official' | 'simulation' = 'official', initialEditor?: ReportEditor, initialInternalNote = '', initialManual: ReportManualComplements = emptyReportManualComplements()) {\n",
        'admin createDraft signature')
    text = replace_once(text,
        "    const sourceSnapshot: any = { ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: mode, ...(mode === 'simulation' ? { simulation_of: parentId, simulation_marked_at: new Date().toISOString() } : {}) };\n",
        "    const sourceSnapshot = attachReportManualComplements({ ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: mode, ...(mode === 'simulation' ? { simulation_of: parentId, simulation_marked_at: new Date().toISOString() } : {}) } as IntelligenceSnapshot, initialManual);\n",
        'admin createDraft snapshot')

    text = replace_once(text,
        "        setEditor(buildEditorialSeedV17(fresh.snapshot, nextType));\n        setInternalNote(''); setDismissedAlerts([]); setLastSavedAt(null); lastSavedPayload.current = '';\n",
        "        setEditor(buildEditorialSeedV17(fresh.snapshot, nextType));\n        setManualComplements(emptyReportManualComplements());\n        setInternalNote(''); setDismissedAlerts([]); setLastSavedAt(null); lastSavedPayload.current = '';\n",
        'admin preview manual reset')
    text = replace_once(text,
        "      setActiveReport(report); setSnapshot(savedSnapshot); setDeliveries(useFrozen ? frozen! : fresh.deliveries); setEditor(editorFrom(report)); setInternalNote(report.internalNote); setDismissedAlerts(report.dismissedAlerts); setLastSavedAt(report.updatedAt);\n      lastSavedPayload.current = JSON.stringify({ summary: report.summary, movements: report.movements.join('\\n'), decisions: report.decisions.join('\\n'), risks: report.risks.join('\\n'), nextSteps: report.nextSteps.join('\\n'), internalNote: report.internalNote, dismissedAlerts: report.dismissedAlerts });\n",
        "      const savedManual = reportManualComplementsFromSnapshot(savedSnapshot);\n      setActiveReport(report); setSnapshot(savedSnapshot); setDeliveries(useFrozen ? frozen! : fresh.deliveries); setEditor(editorFrom(report)); setManualComplements(savedManual); setInternalNote(report.internalNote); setDismissedAlerts(report.dismissedAlerts); setLastSavedAt(report.updatedAt);\n      lastSavedPayload.current = JSON.stringify({ summary: report.summary, movements: report.movements.join('\\n'), decisions: report.decisions.join('\\n'), risks: report.risks.join('\\n'), nextSteps: report.nextSteps.join('\\n'), internalNote: report.internalNote, dismissedAlerts: report.dismissedAlerts, manualComplements: savedManual });\n",
        'admin load manual')
    text = replace_once(text,
        "      setSnapshot(null); setLiveSnapshot(null); setDeliveries([]); setActiveReport(null); setEditor(emptyEditor); setReadiness(null); setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o fechamento.');\n",
        "      setSnapshot(null); setLiveSnapshot(null); setDeliveries([]); setActiveReport(null); setEditor(emptyEditor); setManualComplements(emptyReportManualComplements()); setReadiness(null); setError(requestError instanceof Error ? requestError.message : 'Não foi possível montar o fechamento.');\n",
        'admin error manual reset')

    text = replace_once(text,
        "      await createDraft(fresh, 1, null, 'official', editor, internalNote);\n",
        "      await createDraft(fresh, 1, null, 'official', editor, internalNote, manualComplements);\n",
        'admin closing manual')
    text = replace_once(text,
        "      const sourceSnapshot: any = { ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: previousMode, ...((activeReport.snapshot as any)?.simulation_of ? { simulation_of: (activeReport.snapshot as any).simulation_of } : {}) };\n",
        "      const sourceSnapshot = attachReportManualComplements({ ...fresh.snapshot, deliveryPerformanceV14: fresh.deliveries, workflow_mode: previousMode, ...((activeReport.snapshot as any)?.simulation_of ? { simulation_of: (activeReport.snapshot as any).simulation_of } : {}) } as IntelligenceSnapshot, manualComplements);\n",
        'admin refresh manual')
    text = replace_once(text,
        "      const sourceSnapshot: any = { ...snapshot, deliveryPerformanceV14: deliveries, workflow_mode: 'official' };\n",
        "      const sourceSnapshot = attachReportManualComplements({ ...snapshot, deliveryPerformanceV14: deliveries, workflow_mode: 'official' } as IntelligenceSnapshot, manualComplements);\n",
        'admin approve manual')
    text = replace_once(text,
        "      await createDraft(fresh, activeReport.version + 1, activeReport.id, simulation ? 'simulation' : 'official');\n",
        "      await createDraft(fresh, activeReport.version + 1, activeReport.id, simulation ? 'simulation' : 'official', undefined, '', manualComplements);\n",
        'admin new version manual')

    text = replace_once(text,
        "          {previewEditorial}\n          {history}\n",
        "          <ReportManualComplementsPanel value={manualComplements} onChange={setManualComplements} />\n          {previewEditorial}\n          {history}\n",
        'admin preview panel')
    active_anchor = "          {changes.length ? <section className=\"reports-v16-section\"><div className=\"reports-v16-section-heading\"><span>03</span>"
    if active_anchor not in text:
        raise RuntimeError('admin active panel anchor not found')
    text = text.replace(active_anchor,
        "          <ReportManualComplementsPanel value={manualComplements} onChange={setManualComplements} locked={!canEdit} />\n\n" + active_anchor,
        1)

    text = replace_once(text,
        "<ExecutiveReportPaperV17 company={selectedCompany} snapshot={snapshot} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol || '—'} deliveries={deliveries} />",
        "<ExecutiveReportPaperV17 company={selectedCompany} snapshot={attachReportManualComplements(snapshot, manualComplements)} editor={editor} reportType={reportType} periodName={periodName} protocol={activeReport?.protocol || '—'} deliveries={deliveries} />",
        'admin preview paper manual')

    ADMIN.write_text(text)


def patch_paper() -> None:
    text = PAPER.read_text()
    text = replace_once(text,
        "import { periodChangeSignalsV17 } from '../../lib/reportEditorialV17';\n",
        "import { periodChangeSignalsV17 } from '../../lib/reportEditorialV17';\nimport { augmentReportData, reportManualComplementsFromSnapshot, reportManualMinutes } from '../../lib/reportManualComplements';\n",
        'paper helper import')

    text = replace_once(text,
        "    const ongoing = !item.completion_at && (status.includes('progress') || status.includes('review') || status.includes('adjust')) && (!item.actual_started_at || item.actual_started_at.slice(0, 10) <= end);\n    return ongoing || within(item.effective_due_at, start, end) || within(item.completion_at, start, end) || within(item.actual_started_at, start, end);\n",
        "    const manual = Boolean((item as DeliveryPerformanceRow & { manual_source?: boolean }).manual_source);\n    const ongoing = !item.completion_at && (status.includes('progress') || status.includes('review') || status.includes('adjust')) && (!item.actual_started_at || item.actual_started_at.slice(0, 10) <= end);\n    return manual || ongoing || within(item.effective_due_at, start, end) || within(item.completion_at, start, end) || within(item.actual_started_at, start, end);\n",
        'paper manual relevance')

    text = replace_once(text,
        "  const status = normalized(item.status);\n  if (item.completion_at) {\n",
        "  const status = normalized(item.status);\n  const manual = Boolean((item as DeliveryPerformanceRow & { manual_source?: boolean }).manual_source);\n  if (manual && status.includes('completed') && !item.completion_at) return { label: 'Concluído', tone: 'ok', detail: '' };\n  if (item.completion_at) {\n",
        'paper manual completed')

    text = replace_once(text,
        "export function ExecutiveReportPaperV17({ company, snapshot, editor, reportType, periodName, protocol, deliveries, approvalIdentity, acknowledgementIdentity, approvedAt, acknowledgedAt, acknowledgementProtocol }: Props) {\n  const [canonical, setCanonical] = useState<CanonicalRecord | null>(null);\n",
        "export function ExecutiveReportPaperV17({ company, snapshot, editor, reportType, periodName, protocol, deliveries, approvalIdentity, acknowledgementIdentity, approvedAt, acknowledgedAt, acknowledgementProtocol }: Props) {\n  const manualComplements = reportManualComplementsFromSnapshot(snapshot);\n  const manualMinutes = reportManualMinutes(manualComplements);\n  const augmented = augmentReportData(snapshot, deliveries, manualComplements);\n  snapshot = augmented.snapshot; deliveries = augmented.deliveries;\n  const [canonical, setCanonical] = useState<CanonicalRecord | null>(null);\n",
        'paper augment manual')

    text = replace_once(text,
        "</div> : null}{contractedMinutes ? <p className=\"reports-v19-note\"><strong>Como funciona a disponibilidade:</strong>",
        "</div> : null}{manualMinutes > 0 ? <p className=\"reports-v21-manual-note\"><span className=\"reports-v21-manual-tag\">Manual</span><strong>{formatHoursV14(manualMinutes)}</strong> complementados neste fechamento por não terem sido registrados no Workspace a tempo.</p> : null}{contractedMinutes ? <p className=\"reports-v19-note\"><strong>Como funciona a disponibilidade:</strong>",
        'paper manual capacity note')

    text = replace_once(text,
        "const state = deliveryState(item, snapshot.period.end.slice(0, 10)), complexity = (item as DeliveryPerformanceRow & { complexity?: string | null }).complexity; return <tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.total_minutes ? <small>{formatHoursV14(Number(item.total_minutes))} aplicados</small> : null}</td>",
        "const state = deliveryState(item, snapshot.period.end.slice(0, 10)), complexity = (item as DeliveryPerformanceRow & { complexity?: string | null }).complexity, manual = Boolean((item as DeliveryPerformanceRow & { manual_source?: boolean }).manual_source); return <tr key={item.deliverable_id}><td><div className=\"reports-v21-delivery-title\"><strong>{item.title}</strong>{manual ? <span className=\"reports-v21-manual-tag\">Manual</span> : null}</div>{item.total_minutes ? <small>{formatHoursV14(Number(item.total_minutes))} aplicados</small> : null}</td>",
        'paper manual delivery tag')

    PAPER.write_text(text)


patch_admin()
patch_paper()

# One-shot helper: remove itself and the workflow after applying.
Path('scripts/apply_reports_v21.py').unlink(missing_ok=True)
Path('.github/workflows/apply-reports-v21.yml').unlink(missing_ok=True)
print('Relatórios V21 applied successfully.')
