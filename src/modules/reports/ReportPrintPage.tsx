import { Button } from '../../components/ds/Button';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const rows = snapshot.deliveryPerformanceV14;
  return Array.isArray(rows) ? rows : [];
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
async function waitForPrintAssets(stage: HTMLDivElement) {
  const deadline = performance.now() + 5000;
  while (stage.isConnected && stage.querySelector('[data-report-media-pending]') && performance.now() < deadline) {
    await nextPaint();
  }
  const images = Array.from(stage.getElementsByTagName('img'));
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
export function ReportPrintPage({ role }: Props) {
  const { reportId } = useParams(), navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const printStage = useRef<HTMLDivElement>(null);
  const autoPrint = useMemo(() => new URLSearchParams(window.location.search).get('print') === '1', []);

  useEffect(() => {
    const html = document.documentElement, previousTheme = html.getAttribute('data-workspace-theme'), previousScheme = html.style.colorScheme;
    html.classList.add('report-print-v16-isolated'); html.setAttribute('data-workspace-theme', 'day'); html.style.colorScheme = 'light';
    return () => { html.classList.remove('report-print-v16-isolated'); if (previousTheme) html.setAttribute('data-workspace-theme', previousTheme); else html.removeAttribute('data-workspace-theme'); html.style.colorScheme = previousScheme; };
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
      await prepareAndPrint();
    })();
    return () => { cancelled = true; };
  }, [data, autoPrint]);

  async function prepareAndPrint() {
    const stage = printStage.current;
    if (!stage) return;
    await nextPaint();
    await waitForPrintAssets(stage);
    await nextPaint();
    if (printStage.current === stage) window.print();
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

  if (loading) return (
    <main className="report-print-v16-state tw:grid tw:min-h-screen tw:content-center tw:gap-2.5 tw:bg-cali-day-canvas
      tw:text-center tw:text-[#4c433e] tw:workspace-compact:flex tw:workspace-compact:flex-col tw:workspace-compact:items-center
      tw:workspace-compact:rounded-[0.625rem] tw:workspace-compact:border tw:workspace-compact:border-solid
      tw:workspace-compact:border-[#e9e0d8] tw:workspace-compact:bg-white tw:workspace-compact:px-[1.5625rem]
      tw:workspace-compact:py-[2.875rem] tw:workspace-compact:text-[0.6875rem] tw:workspace-compact:text-[#82786f]">
      <Loader2 className="tw:animate-spin" size={22} />Preparando versão para impressão…
    </main>
  );
  const goBack = () => role === 'client' ? navigate('/cliente/relatorios') : role === 'staff' ? navigate('/equipe/relatorios') : navigate(-1);
  if (error || !data) return (
    <main className="report-print-v16-state error tw:grid tw:min-h-screen tw:content-center tw:gap-2.5 tw:bg-cali-day-canvas
      tw:text-center tw:text-[#4c433e] tw:workspace-compact:flex tw:workspace-compact:flex-col tw:workspace-compact:items-center
      tw:workspace-compact:rounded-[0.625rem] tw:workspace-compact:border tw:workspace-compact:border-solid
      tw:workspace-compact:border-[#e9e0d8] tw:workspace-compact:bg-white tw:workspace-compact:px-[1.5625rem]
      tw:workspace-compact:py-[2.875rem] tw:workspace-compact:text-[0.6875rem] tw:workspace-compact:text-[#82786f]">
      <strong>Não foi possível abrir o relatório.</strong>
      <p className="tw:m-0 tw:text-[#7c706a]">{error}</p>
      <button type="button" className="tw:min-h-[2.375rem] tw:justify-self-center tw:rounded-[0.5625rem] tw:border-0 tw:bg-cali-brand tw:px-3.5 tw:font-extrabold tw:text-white" onClick={goBack}>Voltar</button>
    </main>
  );
  return (
    <main className="report-print-v16-page tw:min-h-screen tw:bg-[#d9d3cf] tw:text-cali-ink tw:workspace-compact:block
      tw:workspace-compact:min-h-0 tw:workspace-compact:bg-transparent tw:workspace-compact:p-0">
      <div className="report-print-v16-toolbar tw:sticky tw:top-0 tw:z-5 tw:flex tw:items-center tw:justify-between
        tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-[#e3dbd5] tw:bg-[#fffdfa] tw:px-[1.125rem] tw:py-3
        tw:shadow-[0_0.375rem_1.125rem_#0000000f] tw:max-[680px]:flex-col tw:max-[680px]:items-start tw:workspace-compact:static
        tw:workspace-compact:mb-3.5 tw:workspace-compact:gap-3.5 tw:workspace-compact:rounded-[0.5625rem]
        tw:workspace-compact:border tw:workspace-compact:border-[#ebe4de] tw:workspace-compact:bg-white
        tw:workspace-compact:px-3.5 tw:workspace-compact:py-[0.6875rem] tw:workspace-compact:shadow-none
        tw:workspace-compact:max-[42.5rem]:flex-wrap tw:workspace-compact:max-[42.5rem]:items-start">
        <div className="tw:grid tw:gap-0.5 tw:workspace-compact:flex tw:workspace-compact:flex-col tw:workspace-compact:gap-1">
          <strong className="tw:text-xs tw:workspace-compact:text-[#3e3533]">Relatório executivo · v{data.version}</strong>
          <span className="tw:text-[0.59375rem] tw:text-[#7f736d] tw:workspace-compact:text-[0.625rem] tw:workspace-compact:text-[#8c8079]">{data.company.name} · {data.periodName}</span>
        </div>
        <div className="tw:flex tw:max-w-full tw:flex-wrap tw:gap-2 tw:workspace-compact:gap-[0.5625rem]">
          <Button type="button" variant="unstyled" className="tw:inline-flex tw:min-h-[2.375rem] tw:cursor-pointer tw:items-center tw:gap-[0.4375rem] tw:rounded-[0.625rem]
            tw:border tw:border-solid tw:border-[#ded4cd] tw:bg-white tw:px-[0.8125rem] tw:py-0 tw:[font-family:inherit] tw:[line-height:inherit] tw:text-[0.6875rem]
            tw:font-extrabold tw:text-cali-brand tw:workspace-compact:h-auto tw:workspace-compact:rounded-[0.4375rem]
            tw:workspace-compact:border-[#e7ddd5] tw:workspace-compact:py-2.5 tw:workspace-compact:font-semibold
            tw:workspace-compact:shadow-none" onClick={goBack}><ArrowLeft size={16} />Voltar</Button>
          <Button className="tw:inline-flex tw:min-h-[2.375rem] tw:cursor-pointer tw:items-center tw:gap-[0.4375rem] tw:rounded-[0.625rem]
            tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[0.8125rem] tw:py-0 tw:[font-family:inherit] tw:[line-height:inherit] tw:text-[0.6875rem]
            tw:font-extrabold tw:text-white tw:workspace-compact:h-auto tw:workspace-compact:rounded-[0.4375rem]
            tw:workspace-compact:py-2.5 tw:workspace-compact:font-semibold tw:workspace-compact:shadow-none" variant="unstyled" type="button" onClick={() => void prepareAndPrint()}><Printer size={16} />Imprimir / salvar PDF</Button>
        </div>
      </div>
      <div ref={printStage} role="region" aria-label="Prévia do relatório" tabIndex={0}
        className="report-print-v16-stage tw:max-w-full tw:overflow-x-auto tw:pt-6 tw:pb-[3.125rem]">
        <WorkspaceExecutiveReportPaper
          pinnedCompanyLogo
          company={data.company}
          snapshot={data.snapshot}
          editor={data.editor}
          reportType={data.reportType}
          periodName={data.periodName}
          protocol={data.protocol}
          deliveries={data.deliveries}
          approvalIdentity={data.approvalIdentity}
          acknowledgementIdentity={data.ackIdentity}
          approvedAt={data.approvedAt}
          acknowledgedAt={data.acknowledgedAt}
          acknowledgementProtocol={data.ackProtocol}
        />
      </div>
    </main>
  );
}
