import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExecutiveReportPaperV17 } from '../../components/reports/ExecutiveReportPaperV17';
import type { ReportIdentityV55 } from '../../components/reports/ReportValidationV55';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { type ReportEditor, type ReportType } from '../../lib/reportComposition';
import { normalizeIntelligenceSnapshot, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import type { DeliveryPerformanceRow } from '../../lib/reportV14';

type Props = { role: 'admin' | 'client' };
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
function editorOf(row: any): ReportEditor {
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

export function ReportPrintPageV17({ role }: Props) {
  const { reportId } = useParams(), navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const autoPrint = useMemo(() => new URLSearchParams(window.location.search).get('print') === '1', []);

  useEffect(() => {
    const html = document.documentElement, previousTheme = html.getAttribute('data-workspace-theme'), previousScheme = html.style.colorScheme;
    html.classList.add('report-print-v16-isolated'); html.setAttribute('data-workspace-theme', 'day'); html.style.colorScheme = 'light'; document.body.classList.add('reports-v16-print-route');
    return () => { html.classList.remove('report-print-v16-isolated'); document.body.classList.remove('reports-v16-print-route'); if (previousTheme) html.setAttribute('data-workspace-theme', previousTheme); else html.removeAttribute('data-workspace-theme'); html.style.colorScheme = previousScheme; };
  }, []);
  useEffect(() => { void load(); }, [reportId, role]);
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

  async function load() {
    if (!supabase || !reportId) return;
    setLoading(true); setError('');
    try {
      let companyId = '';
      if (role === 'client') {
        const user = await supabase.auth.getUser(); if (user.error) throw user.error;
        const profile = await supabase.from('profiles').select('company_id').eq('id', user.data.user?.id || '').maybeSingle(); if (profile.error) throw profile.error;
        companyId = String(profile.data?.company_id || ''); if (!companyId) throw new Error('Empresa vinculada ao acesso não encontrada.');
      }
      let query = supabase.from('reports').select('id,company_id,report_type,period_start,reference_month,status,executive_summary,movements,decisions,risks,next_steps,source_snapshot,protocol,version,approval_identity_snapshot,acknowledgement_identity_snapshot,approved_at,acknowledged_at,acknowledgement_protocol').eq('id', reportId);
      if (role === 'client') query = query.eq('company_id', companyId).in('status', ['sent', 'published']); else query = query.neq('status', 'archived');
      const reportResult = await query.maybeSingle(); if (reportResult.error) throw reportResult.error;
      const report = reportResult.data; if (!report) throw new Error('Relatório não encontrado ou não disponível para este acesso.');
      const snapshot = normalizeIntelligenceSnapshot(report.source_snapshot); if (!snapshot) throw new Error('A fotografia aprovada deste relatório não está disponível.');
      const companyResult = await supabase.from('companies').select('display_name,logo_url').eq('id', report.company_id).maybeSingle(); if (companyResult.error) throw companyResult.error;
      const start = String(report.period_start || report.reference_month).slice(0, 10), type = (report.report_type || 'monthly') as ReportType;
      const resolvedLogo = await resolveWorkspaceMedia(companyResult.data?.logo_url, 86400, true);
      const printableLogo = await imageAsDataUrl(resolvedLogo);
      setData({ company: { name: companyResult.data?.display_name || 'Empresa', logoUrl: printableLogo || resolvedLogo || null }, snapshot, editor: editorOf(report), reportType: type, periodName: periodLabel(type, start), protocol: report.protocol || '—', deliveries: deliveriesOf(snapshot), version: Number(report.version || 1), approvalIdentity: report.approval_identity_snapshot || null, ackIdentity: report.acknowledgement_identity_snapshot || null, approvedAt: report.approved_at || null, acknowledgedAt: report.acknowledged_at || null, ackProtocol: report.acknowledgement_protocol || null });
      if (role === 'client') await supabase.rpc('record_report_client_event_v55', { p_report_id: reportId, p_event_type: 'pdf_opened' });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível abrir o relatório.'); }
    finally { setLoading(false); }
  }

  if (loading) return <main className="report-print-v16-state"><Loader2 className="spin" size={22} />Preparando versão para impressão…</main>;
  if (error || !data) return <main className="report-print-v16-state error"><strong>Não foi possível abrir o relatório.</strong><p>{error}</p><button type="button" onClick={() => navigate(-1)}>Voltar</button></main>;
  return <main className="report-print-v16-page"><div className="report-print-v16-toolbar"><div><strong>Relatório executivo · v{data.version}</strong><span>{data.company.name} · {data.periodName}</span></div><div><button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Voltar</button><button className="primary" type="button" onClick={() => void prepareAndPrint(data)}><Printer size={16} />Imprimir / salvar PDF</button></div></div><div className="report-print-v16-stage"><ExecutiveReportPaperV17 company={data.company} snapshot={data.snapshot} editor={data.editor} reportType={data.reportType} periodName={data.periodName} protocol={data.protocol} deliveries={data.deliveries} approvalIdentity={data.approvalIdentity} acknowledgementIdentity={data.ackIdentity} approvedAt={data.approvedAt} acknowledgedAt={data.acknowledgedAt} acknowledgementProtocol={data.ackProtocol} /></div></main>;
}
