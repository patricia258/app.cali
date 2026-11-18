import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Link } from '../../../../components/navigation/Link';
import { periodLabelV14, type ReportLifecycleStatus } from '../../../../lib/reportCloseMetrics';
import type { ReportType } from '../../../../lib/reportComposition';
import { ReportSectionHeading } from './ReportSectionHeading';

type Version = {
  id: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  version: number;
  status: ReportLifecycleStatus;
  isSimulation: boolean;
  clientOpenCount: number;
  acknowledgedAt?: string | null;
  updatedAt: string;
  approvedAt?: string | null;
  sentAt?: string | null;
};

export function ReportVersionHistory({ reports, activeReportId, statusLabel, formatDateTime, onSelect, onDelete, renderCorrection }: {
  reports: Version[];
  activeReportId?: string;
  statusLabel: Record<ReportLifecycleStatus, string>;
  formatDateTime: (value: string) => string;
  onSelect: (report: Version) => void;
  onDelete: (reportId: string) => void;
  renderCorrection: (reportId: string) => ReactNode;
}) {
  return (
    <section className="reports-v16-history tw:border-t tw:border-solid tw:border-cali-sand-line tw:px-10 tw:pt-8.5
      tw:pb-10 tw:max-[680px]:px-5.5 tw:workspace-night:border-cali-neutral-strong" aria-label="Histórico e versões">
      <ReportSectionHeading
        number="08"
        title="Histórico e versões"
        description="Cada versão oficial preserva o fechamento daquele período. Abra uma versão para consultar o documento congelado."
      />
      <div className="reports-v16-history-table tw:border-t tw:border-solid tw:border-cali-neutral-line tw:max-[680px]:overflow-auto tw:workspace-night:border-cali-neutral-text">
        <div className="head tw:grid tw:grid-cols-[minmax(0,1.4fr)_4.375rem_minmax(0,1.6fr)_minmax(0,0.9fr)_10rem] tw:items-center
          tw:gap-5 tw:border-b tw:border-solid tw:border-cali-neutral-line tw:py-3 tw:text-cali-label
          tw:font-extrabold tw:tracking-[0.08em] tw:text-cali-sand-text tw:uppercase tw:max-[680px]:min-w-[58.46154rem]
          tw:workspace-night:border-cali-line-strong tw:workspace-night:text-cali-sand-accent">
          <span>Período</span><span>Versão</span><span>Status</span><span>Data</span><span>Ações</span>
        </div>
        {reports.map((report) => {
          const editable = report.status === 'draft' || report.status === 'review';
          const clientStatus = [report.clientOpenCount > 0 && 'Visualizado', report.acknowledgedAt && 'Ciência ✓'].filter(Boolean).join(' · ');
          return (
            <div className={`tw:grid tw:grid-cols-[minmax(0,1.4fr)_4.375rem_minmax(0,1.6fr)_minmax(0,0.9fr)_10rem] tw:items-center tw:gap-5 tw:border-b tw:border-solid tw:border-cali-line tw:py-3.5 tw:text-sm tw:text-cali-neutral-text tw:max-[680px]:min-w-[58.46154rem] tw:workspace-night:border-cali-line-strong tw:workspace-night:text-cali-sand-accent ${report.id === activeReportId ? 'active tw:pl-3.5 tw:shadow-[inset_0.1875rem_0_var(--cali-color-gold-accent)]' : ''}`} key={report.id} data-report-id={report.id}>
              <button type="button" className="period tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-sm
                tw:font-extrabold tw:text-cali-text tw:workspace-night:text-cali-neutral-soft" onClick={() => onSelect(report)}>{periodLabelV14(report.reportType, report.periodStart)}</button>
              <span>v{report.version}</span>
              <span className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-2">
                {report.isSimulation ? 'Simulação' : statusLabel[report.status]}
                {clientStatus && <small className="tw:m-0 tw:inline-flex tw:items-center tw:rounded-md tw:bg-cali-surface-muted tw:px-2.5
                  tw:py-1 tw:text-xs tw:font-semibold tw:whitespace-nowrap tw:text-cali-muted">{clientStatus}</small>}
              </span>
              <span>{formatDateTime(report.sentAt || report.approvedAt || report.updatedAt)}</span>
              <span className="actions tw:flex tw:items-center tw:justify-end tw:gap-2.5">
                <Link
                  className="tw:inline-flex tw:items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line
                    tw:bg-cali-surface tw:px-2.5 tw:py-2 tw:font-semibold tw:text-cali-accent
                    tw:no-underline tw:hover:bg-cali-gold/10"
                  to={`/admin/relatorios/impressao/${encodeURIComponent(report.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir esta versão congelada"
                >{report.status === 'archived' ? 'Ver versão arquivada' : 'Ver versão'}</Link>
                {editable && <button type="button" className="delete tw:grid tw:size-8.5 tw:cursor-pointer tw:place-items-center tw:rounded-cali-compact-control
                  tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-sand-surface tw:p-1.5 tw:text-cali-red-text" onClick={() => onDelete(report.id)} aria-label="Excluir versão"><Trash2 size={14} /></button>}
                {renderCorrection(report.id)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
