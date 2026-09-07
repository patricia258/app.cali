import { useEffect, useState } from 'react';
import type { ReportEditor, ReportType } from '../../lib/reportComposition';
import { packageLabel, type IntelligenceSnapshot } from '../../lib/reportIntelligence';
import { deliveryRowsForPdf, deliveryTimingLabelV14, formatHoursV14, reportKpisV14, type DeliveryPerformanceRow } from '../../lib/reportV14';
import { feedbackLabelV16 } from '../../lib/reportV16';
import { periodChangeSignalsV17 } from '../../lib/reportEditorialV17';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { supabase } from '../../lib/supabase';
import { ReportValidationBlockV55, type ReportIdentityV55 } from './ReportValidationV55';

type Company = { name: string; logoUrl?: string | null };
type Props = {
  company: Company;
  snapshot: IntelligenceSnapshot;
  editor: ReportEditor;
  reportType: ReportType;
  periodName: string;
  protocol: string;
  deliveries: DeliveryPerformanceRow[];
  approvalIdentity?: ReportIdentityV55 | null;
  acknowledgementIdentity?: ReportIdentityV55 | null;
  approvedAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgementProtocol?: string | null;
};
type CanonicalRecord = {
  approvalIdentity?: ReportIdentityV55 | null;
  acknowledgementIdentity?: ReportIdentityV55 | null;
  approvedAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgementProtocol?: string | null;
  logoUrl?: string | null;
};

type Metric = { label: string; value: string; detail: string };

const CALI_LOGO = 'https://mapa.calirh.com/logo.svg';
const REPORT_V17_CSS = `
.reports-v16-preview-backdrop{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;padding:24px!important;display:flex!important;justify-content:center!important;align-items:flex-start!important}
.reports-v16-preview-modal{width:min(1240px,calc(100vw - 180px))!important;max-width:1240px!important;height:calc(100vh - 48px)!important;margin:0 auto!important}
.reports-v16-preview-document{width:100%!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;overflow:auto!important}
.reports-v16-preview-document>.reports-v16-document{margin-inline:auto!important}
.reports-v16-paper-signature{position:relative!important}
.reports-v16-paper-signature .report-validation-document-v57{margin:18mm 0 0!important;padding:8mm 0 0!important;border-top:1px solid #D9CFC8!important;break-inside:avoid!important;page-break-inside:avoid!important}
.reports-v16-paper-signature .report-validation-head-v57{margin-bottom:14mm!important}
.reports-v16-paper-signature .report-signature-label-v57{margin-bottom:14mm!important}
.reports-v16-paper-signature .report-signature-line-v57{min-height:16mm!important;overflow:visible!important}
.reports-v16-paper-signature .report-signature-person-v57{margin-top:4mm!important}
.reports-v16-paper-signature .report-signature-meta-v57{margin-top:4mm!important}
.reports-v16-paper-signature .reports-v16-footer{bottom:8mm!important}
.reports-v16-paper-signature .reports-v16-client-id>img,.reports-v16-paper-two .reports-v16-client-id>img,.reports-v16-paper-one .reports-v16-client-id>img{object-fit:contain!important;object-position:center!important}
@media(max-width:900px){.reports-v16-preview-backdrop{padding:12px!important}.reports-v16-preview-modal{width:calc(100vw - 24px)!important;height:calc(100vh - 24px)!important}}
@media print{.reports-v16-paper-signature,.reports-v16-paper-signature .report-validation-document-v57,.reports-v16-paper-signature .report-signature-grid-v57,.reports-v16-paper-signature .report-signature-party-v57{break-inside:avoid!important;page-break-inside:avoid!important}}
`;

function lines(value: string) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
}
function periodRange(snapshot: IntelligenceSnapshot) {
  return `${formatDate(snapshot.period.start)} a ${formatDate(snapshot.period.end)}`;
}

export function ExecutiveReportPaperV17({
  company,
  snapshot,
  editor,
  reportType,
  periodName,
  protocol,
  deliveries,
  approvalIdentity,
  acknowledgementIdentity,
  approvedAt,
  acknowledgedAt,
  acknowledgementProtocol,
}: Props) {
  const [canonical, setCanonical] = useState<CanonicalRecord | null>(null);

  useEffect(() => {
    if (!supabase || !protocol || protocol === '—') return;
    let cancelled = false;
    async function hydrateCanonical() {
      if (!supabase) return;
      const reportResult = await supabase
        .from('reports')
        .select('company_id,approval_identity_snapshot,acknowledgement_identity_snapshot,approved_at,acknowledged_at,acknowledgement_protocol')
        .eq('protocol', protocol)
        .maybeSingle();
      if (cancelled || reportResult.error || !reportResult.data) return;
      const row = reportResult.data as any;
      let logoUrl = '';
      const companyResult = await supabase.from('companies').select('logo_url').eq('id', row.company_id).maybeSingle();
      if (!cancelled && !companyResult.error && companyResult.data?.logo_url) {
        logoUrl = await resolveWorkspaceMedia(companyResult.data.logo_url, 86400, true);
      }
      if (cancelled) return;
      setCanonical({
        approvalIdentity: row.approval_identity_snapshot || null,
        acknowledgementIdentity: row.acknowledgement_identity_snapshot || null,
        approvedAt: row.approved_at || null,
        acknowledgedAt: row.acknowledged_at || null,
        acknowledgementProtocol: row.acknowledgement_protocol || null,
        logoUrl: logoUrl || null,
      });
    }
    void hydrateCanonical();
    const timer = window.setInterval(() => void hydrateCanonical(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [protocol]);

  const effectiveApprovalIdentity = canonical ? canonical.approvalIdentity || null : approvalIdentity;
  const effectiveAcknowledgementIdentity = canonical ? canonical.acknowledgementIdentity || null : acknowledgementIdentity;
  const effectiveApprovedAt = canonical ? canonical.approvedAt || null : approvedAt;
  const effectiveAcknowledgedAt = canonical ? canonical.acknowledgedAt || null : acknowledgedAt;
  const effectiveAcknowledgementProtocol = canonical ? canonical.acknowledgementProtocol || null : acknowledgementProtocol;
  const clientLogo = canonical?.logoUrl || company.logoUrl || null;

  const kpis = reportKpisV14(snapshot, deliveries);
  const usedMinutes = Math.max(0, Number(kpis.consumedMinutes || 0));
  const contractedMinutes = Math.max(0, Number(kpis.contractedHours || 0) * 60);
  const usagePercent = contractedMinutes ? Math.round((usedMinutes / contractedMinutes) * 100) : null;
  const extraMinutes = Math.max(0, usedMinutes - contractedMinutes);
  const deliveryRows = deliveryRowsForPdf(snapshot, deliveries).slice(0, 5);
  const changes = periodChangeSignalsV17(snapshot, reportType);
  const risks = lines(editor.risks).slice(0, 3);
  const decisions = lines(editor.decisions).slice(0, 4);
  const nextSteps = lines(editor.nextSteps).slice(0, 3);
  const feedback = snapshot.feedback.responses.filter((item) => item.comment?.trim()).slice(0, 1);
  const feedbackLabel = feedbackLabelV16(snapshot);

  const metrics: Metric[] = [];
  if (contractedMinutes > 0 || usedMinutes > 0) {
    metrics.push({
      label: extraMinutes > 0 ? 'Consumo no período' : 'Capacidade utilizada',
      value: usagePercent === null ? formatHoursV14(usedMinutes) : `${usagePercent}%`,
      detail: contractedMinutes > 0 ? `${formatHoursV14(usedMinutes)} de ${kpis.contractedHours}h` : `${formatHoursV14(usedMinutes)} registradas`,
    });
  }
  if (kpis.plannedDeliveries > 0) {
    metrics.push({
      label: 'Entregas previstas',
      value: `${kpis.completedDeliveries}/${kpis.plannedDeliveries}`,
      detail: 'concluídas no período',
    });
  }
  if (kpis.deliveryAdherence !== null) {
    metrics.push({
      label: 'Aderência ao prazo',
      value: `${kpis.deliveryAdherence}%`,
      detail: 'das conclusões avaliadas',
    });
  }
  if (snapshot.feedback.count >= 2 && feedbackLabel) {
    metrics.push({
      label: 'Percepção do cliente',
      value: feedbackLabel,
      detail: `${snapshot.feedback.count} avaliações no período`,
    });
  }

  const hasValidation = Boolean(effectiveApprovalIdentity || effectiveAcknowledgementIdentity);
  const hasDirectionPage = Boolean(risks.length || decisions.length || nextSteps.length || feedback.length);
  const totalPages = 1 + (hasDirectionPage ? 1 : 0) + (hasValidation ? 1 : 0);
  const validationPageNumber = hasDirectionPage ? 3 : 2;
  const cycleLabel = snapshot.cycleContext?.projectName || kpis.cycleLabel || snapshot.projects[0]?.name || 'Acompanhamento CALI';
  const documentType = reportType === 'quarterly' ? 'RELATÓRIO TRIMESTRAL' : 'RELATÓRIO MENSAL';

  return <div className="reports-v16-document">
    <style>{REPORT_V17_CSS}</style>
    <article className="reports-v16-paper reports-v16-paper-one">
      <header className="reports-v16-paper-header">
        <div className="reports-v16-brand"><img src={CALI_LOGO} alt="CALI RH" /></div>
        <div className="reports-v16-client-id">
          <div><small>{documentType}</small><strong>{company.name}</strong><span>{periodName}</span></div>
          {clientLogo ? <img src={clientLogo} alt={company.name} /> : null}
        </div>
      </header>
      <div className="reports-v16-meta"><span>{packageLabel(snapshot)}</span><i /><span>{cycleLabel}</span><i /><span>{periodRange(snapshot)}</span></div>

      <section className="reports-v16-reading">
        <span className="reports-v16-kicker">LEITURA EXECUTIVA CALI</span>
        <h1>O que este período revela.</h1>
        <p>{editor.summary.trim() || 'A leitura executiva deste período ainda está em revisão.'}</p>
      </section>

      {metrics.length ? <section className="reports-v16-facts">
        <div className="reports-v16-section-head"><div><small>INDICADORES DO PERÍODO</small><h2>Somente o que tem base real.</h2></div></div>
        <div className="reports-v16-metrics" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))` }}>
          {metrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.detail}</span></div>)}
        </div>
        {extraMinutes > 0 ? <p className="reports-v16-capacity-note">Consumo adicional no período: <strong>+{formatHoursV14(extraMinutes)}</strong>.</p> : null}
      </section> : null}

      {deliveryRows.length ? <section className="reports-v16-execution-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="reports-v16-execution-block">
          <div className="reports-v16-section-head compact"><div><small>EXECUÇÃO DO PERÍODO</small><h2>Planejado x realizado</h2></div></div>
          <table><thead><tr><th>Entregável</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>
            {deliveryRows.map((item) => <tr key={item.deliverable_id}><td><strong>{item.title}</strong>{item.workstream ? <span>{item.workstream}</span> : null}</td><td>{formatDate(item.effective_due_at)}</td><td>{formatDate(item.completion_at)}</td><td>{deliveryTimingLabelV14(item)}</td></tr>)}
          </tbody></table>
        </div>
      </section> : null}

      {changes.length ? <section className="reports-v16-changes">
        <div className="reports-v16-section-head compact"><div><small>COMPARATIVO</small><h2>{reportType === 'quarterly' ? 'Evolução dentro do trimestre' : 'O que mudou desde o fechamento anterior'}</h2></div></div>
        <div>{changes.map((item) => <article className={`tone-${item.tone}`} key={item.id}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}</div>
      </section> : null}

      <footer className="reports-v16-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>{totalPages > 1 ? `1 / ${totalPages}` : '1'}</b></footer>
    </article>

    {hasDirectionPage ? <article className="reports-v16-paper reports-v16-paper-two">
      <header className="reports-v16-paper-header compact">
        <div className="reports-v16-brand"><img src={CALI_LOGO} alt="CALI RH" /></div>
        <div className="reports-v16-client-id"><div><small>LEITURA E DIREÇÃO</small><strong>{company.name}</strong><span>{periodName}</span></div>{clientLogo ? <img src={clientLogo} alt={company.name} /> : null}</div>
      </header>
      <div className="reports-v16-page-two-title"><span>DO FATO À DIREÇÃO</span><h1>O que merece decisão, atenção e movimento.</h1></div>

      {risks.length ? <section className="reports-v16-editorial-block">
        <div className="reports-v16-section-head compact"><div><small>PONTOS DE ATENÇÃO</small><h2>Risco, recomendação e dependência.</h2></div></div>
        <div className="reports-v16-numbered">{risks.map((item, index) => <article key={`${item}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{item}</p></article>)}</div>
      </section> : null}

      {decisions.length ? <section className="reports-v16-editorial-block">
        <div className="reports-v16-section-head compact"><div><small>DECISÕES DO PERÍODO</small><h2>Direcionamentos selecionados pela CALI.</h2></div></div>
        <ol>{decisions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>
      </section> : null}

      {nextSteps.length ? <section className="reports-v16-editorial-block next">
        <div className="reports-v16-section-head compact"><div><small>{reportType === 'quarterly' ? 'PRÓXIMO TRIMESTRE' : 'PRÓXIMO CICLO'}</small><h2>{reportType === 'quarterly' ? 'Prioridades do próximo trimestre' : 'Prioridades do próximo ciclo'}</h2></div></div>
        <div className="reports-v16-numbered">{nextSteps.map((item, index) => <article key={`${item}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{item}</p></article>)}</div>
      </section> : null}

      {feedback[0]?.comment ? <section className="reports-v16-feedback">
        <div><small>PERCEPÇÃO DO CLIENTE</small>{feedbackLabel ? <strong>{feedbackLabel}</strong> : null}<span>{snapshot.feedback.count} avaliação(ões) no período</span></div>
        <blockquote>“{feedback[0].comment}”</blockquote>
      </section> : null}

      <footer className="reports-v16-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>2 / {totalPages}</b></footer>
    </article> : null}

    {hasValidation ? <article className="reports-v16-paper reports-v16-paper-signature">
      <header className="reports-v16-paper-header compact">
        <div className="reports-v16-brand"><img src={CALI_LOGO} alt="CALI RH" /></div>
        <div className="reports-v16-client-id"><div><small>REGISTRO DO DOCUMENTO</small><strong>{company.name}</strong><span>{periodName}</span></div>{clientLogo ? <img src={clientLogo} alt={company.name} /> : null}</div>
      </header>
      <ReportValidationBlockV55 approvalIdentity={effectiveApprovalIdentity} acknowledgementIdentity={effectiveAcknowledgementIdentity} approvedAt={effectiveApprovedAt} acknowledgedAt={effectiveAcknowledgedAt} acknowledgementProtocol={effectiveAcknowledgementProtocol} />
      <footer className="reports-v16-footer"><span>CALI RH · Patrícia Lima</span><span>{protocol}</span><b>{validationPageNumber} / {totalPages}</b></footer>
    </article> : null}
  </div>;
}
