import { Button } from '../../components/ds/Button';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useNavigate } from '../../hooks/useNavigate';
import { useParams } from '../../hooks/useParams';
import { WorkspaceExecutiveReportPaper } from '../../components/reports/WorkspaceExecutiveReportPaper';
import type { ReportIdentityV55 } from '../../domain/report-identity';
import { readPrintableReport, readPrintableReportCompany, type PrintableReport, type ReportPrintRole } from '../../api/reports/print';
import { recordReportRead } from '../../api/client/reports/library';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { type ReportEditor, type ReportType } from '../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import type { DeliveryPerformanceRow } from '../../lib/reportCloseMetrics';

/* staff = Equipe CALI: só lê relatórios já enviados ao cliente, das empresas atribuídas a ela (a proteção por linha limita as empresas). */
type Props = { role: ReportPrintRole };
type Loaded = {
  company: { name: string; logoUrl?: string | null };
  snapshot: IntelligenceSnapshot;
  editor: ReportEditor;
  reportType: ReportType;
  periodName: string;
  protocol: string;
  deliveries: DeliveryPerformanceRow[];
  version: number;
  approvalIdentity?: ReportIdentityV55 | null;
  ackIdentity?: ReportIdentityV55 | null;
  approvedAt?: string | null;
  acknowledgedAt?: string | null;
  ackProtocol?: string | null;
};

function periodLabel(type: ReportType, start: string) {
  const [year, month] = start.split('-').map(Number);
  return type === 'monthly'
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
    : `${Math.floor((month - 1) / 3) + 1}º trimestre de ${year}`;
}
function editorOf(row: PrintableReport): ReportEditor {
  return {
    summary: row.executive_summary || '',
    movements: Array.isArray(row.movements) ? row.movements.map(String).join('\n') : '',
    decisions: Array.isArray(row.decisions) ? row.decisions.map(String).join('\n') : '',
    risks: Array.isArray(row.risks) ? row.risks.map(String).join('\n') : '',
    nextSteps: Array.isArray(row.next_steps) ? row.next_steps.map(String).join('\n') : '',
  };
}
function deliveriesOf(snapshot: IntelligenceSnapshot) {
  const raw = (snapshot as any)?.deliveryPerformanceV14;
  return Array.isArray(raw) ? raw as DeliveryPerformanceRow[] : [];
}
async function imageAsDataUrl(url?: string | null) {
  if (!url || url.startsWith('data:')) return url || '';
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return url;
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}
async function waitForPrintAssets() {
  const images = Array.from(document.images);
  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      });
    }
    if (typeof image.decode === 'function') {
      try { await image.decode(); } catch { /* broken image is handled by the document fallback */ }
    }
  }));
  try { await document.fonts?.ready; } catch { /* browser without FontFaceSet */ }
}
function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
function pinClientLogoForPrint(logoUrl?: string | null) {
  if (!logoUrl) return;
  document.querySelectorAll<HTMLImageElement>('.reports-v19-client > img').forEach((image) => {
    if (image.src !== logoUrl) image.src = logoUrl;
  });
}

export function ReportPrintPage({ role }: Props) {
  const { reportId } = useParams(), navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const autoPrint = useMemo(() => new URLSearchParams(window.location.search).get('print') === '1', []);

  useEffect(() => {
    const html = document.documentElement, previousTheme = html.getAttribute('data-workspace-theme'), previousScheme = html.style.colorScheme;
    html.classList.add('report-print-v16-isolated'); html.setAttribute('data-workspace-theme', 'day'); html.style.colorScheme = 'light'; document.body.classList.add('reports-v16-print-route');
    return () => { html.classList.remove('report-print-v16-isolated'); document.body.classList.remove('reports-v16-print-route'); if (previousTheme) html.setAttribute('data-workspace-theme', previousTheme); else html.removeAttribute('data-workspace-theme'); html.style.colorScheme = previousScheme; };
  }, []);
  useEffect(() => {
    if (!reportId) return;
    const controller = new AbortController();
    void load(reportId, controller.signal);
    return () => controller.abort();
  }, [reportId, role]);
  useEffect(() => {
    if (!data || !autoPrint) return;
    let cancelled = false;
    void (async () => {
      document.title = `Relatório CALI RH - ${data.company.name} - ${data.periodName}`;
      await new Promise((resolve) => window.setTimeout(resolve, 320));
      if (cancelled) return;
      await prepareAndPrint(data);
    })();
    return () => { cancelled = true; };
  }, [data, autoPrint]);

  async function prepareAndPrint(current: Loaded) {
    pinClientLogoForPrint(current.company.logoUrl);
    await nextPaint();
    await waitForPrintAssets();
    pinClientLogoForPrint(current.company.logoUrl);
    await nextPaint();
    await waitForPrintAssets();
    window.print();
  }

  async function load(id: string, signal: AbortSignal) {
    setLoading(true); setError(''); setData(null);
    try {
      const report = await readPrintableReport(id, role, signal);
      const snapshot = normalizeIntelligenceSnapshot(report.source_snapshot);
      if (!snapshot) throw new Error('A fotografia aprovada deste relatório não está disponível.');
      const company = await readPrintableReportCompany(report.company_id, signal);
      const start = String(report.period_start || report.reference_month).slice(0, 10), type = (report.report_type || 'monthly') as ReportType;
      const resolvedLogo = await resolveWorkspaceMedia(company?.logo_url, 86400, true);
      const printableLogo = await imageAsDataUrl(resolvedLogo);
      if (signal.aborted) return;
      setData({ company: { name: company?.display_name || 'Empresa', logoUrl: printableLogo || resolvedLogo || null }, snapshot, editor: editorOf(report), reportType: type, periodName: periodLabel(type, start), protocol: report.protocol || '—', deliveries: deliveriesOf(snapshot), version: Number(report.version || 1), approvalIdentity: (report.approval_identity_snapshot as ReportIdentityV55 | null) || null, ackIdentity: (report.acknowledgement_identity_snapshot as ReportIdentityV55 | null) || null, approvedAt: report.approved_at || null, acknowledgedAt: report.acknowledged_at || null, ackProtocol: report.acknowledgement_protocol || null });
      if (role === 'client') await recordReportRead(id, 'pdf_opened');
    } catch (requestError) {
      if (!signal.aborted) setError(requestError instanceof Error ? requestError.message : 'Não foi possível abrir o relatório.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }

  if (loading) return <main className="report-print-v16-state"><Loader2 className="spin" size={22} />Preparando versão para impressão…</main>;
  const goBack = () => role === 'client' ? navigate('/cliente/relatorios') : role === 'staff' ? navigate('/equipe/relatorios') : navigate(-1);
  if (error || !data) return <main className="report-print-v16-state error"><strong>Não foi possível abrir o relatório.</strong><p>{error}</p><button type="button" onClick={goBack}>Voltar</button></main>;
  return <main className="report-print-v16-page"><div className="report-print-v16-toolbar"><div><strong>Relatório executivo · v{data.version}</strong><span>{data.company.name} · {data.periodName}</span></div><div><button type="button" onClick={goBack}><ArrowLeft size={16} />Voltar</button><Button variant="primary" type="button" onClick={() => void prepareAndPrint(data)}><Printer size={16} />Imprimir / salvar PDF</Button></div></div><div className="report-print-v16-stage"><WorkspaceExecutiveReportPaper company={data.company} snapshot={data.snapshot} editor={data.editor} reportType={data.reportType} periodName={data.periodName} protocol={data.protocol} deliveries={data.deliveries} approvalIdentity={data.approvalIdentity} acknowledgementIdentity={data.ackIdentity} approvedAt={data.approvedAt} acknowledgedAt={data.acknowledgedAt} acknowledgementProtocol={data.ackProtocol} /></div></main>;
}
