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
    <section className="reports-v16-history tw:border-t tw:border-solid tw:border-[#ece5df] tw:px-[2.46154rem] tw:pt-[2.15385rem]
      tw:pb-[2.46154rem] tw:max-[680px]:px-[1.38462rem] tw:workspace-night:border-[#3b2d32]" aria-label="Histórico e versões">
      <ReportSectionHeading
        number="08"
        title="Histórico e versões"
        description="Cada versão oficial preserva o fechamento daquele período. Abra uma versão para consultar o documento congelado."
      />
      <div className="reports-v16-history-table tw:border-t tw:border-solid tw:border-[#dcd3cd] tw:max-[680px]:overflow-auto tw:workspace-night:border-[#45343a]">
        <div className="head tw:grid tw:grid-cols-[minmax(0,1.4fr)_4.375rem_minmax(0,1.6fr)_minmax(0,0.9fr)_10rem] tw:items-center
          tw:gap-[1.23077rem] tw:border-b tw:border-solid tw:border-[#dcd3cd] tw:py-[0.69231rem] tw:text-[0.69231rem]
          tw:font-extrabold tw:tracking-[0.08em] tw:text-[#8b7d76] tw:uppercase tw:max-[680px]:min-w-[58.46154rem]
          tw:workspace-night:border-[#3d3034] tw:workspace-night:text-[#c2b5b0]">
          <span>Período</span><span>Versão</span><span>Status</span><span>Data</span><span>Ações</span>
        </div>
        {reports.map((report) => {
          const editable = report.status === 'draft' || report.status === 'review';
          const clientStatus = [report.clientOpenCount > 0 && 'Visualizado', report.acknowledgedAt && 'Ciência ✓'].filter(Boolean).join(' · ');
          return (
            <div className={`tw:grid tw:grid-cols-[minmax(0,1.4fr)_4.375rem_minmax(0,1.6fr)_minmax(0,0.9fr)_10rem] tw:items-center tw:gap-[1.23077rem] tw:border-b tw:border-solid tw:border-[#eee7e2] tw:py-[0.84615rem] tw:text-[0.84615rem] tw:text-[#4a423d] tw:max-[680px]:min-w-[58.46154rem] tw:workspace-night:border-[#3d3034] tw:workspace-night:text-[#c2b5b0] ${report.id === activeReportId ? 'active tw:pl-[0.92308rem] tw:shadow-[inset_0.1875rem_0_#b58c52]' : ''}`} key={report.id} data-report-id={report.id}>
              <button type="button" className="period tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[0.84615rem]
                tw:font-extrabold tw:text-[#2f2926] tw:workspace-night:text-[#f0e9e6]" onClick={() => onSelect(report)}>{periodLabelV14(report.reportType, report.periodStart)}</button>
              <span>v{report.version}</span>
              <span className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-x-[0.76923rem] tw:gap-y-[0.46154rem]">
                {report.isSimulation ? 'Simulação' : statusLabel[report.status]}
                {clientStatus && <small className="tw:m-0 tw:inline-flex tw:items-center tw:rounded-[0.38462rem] tw:bg-[#f6f0eb] tw:px-[0.61538rem]
                  tw:py-[0.23077rem] tw:text-[0.76923rem] tw:font-semibold tw:whitespace-nowrap tw:text-[#67574c]">{clientStatus}</small>}
              </span>
              <span>{formatDateTime(report.sentAt || report.approvedAt || report.updatedAt)}</span>
              <span className="actions tw:flex tw:items-center tw:justify-end tw:gap-[0.61538rem]">
                <Link
                  className="tw:inline-flex tw:items-center tw:rounded-[0.53846rem] tw:border tw:border-solid tw:border-cali-line
                    tw:bg-cali-surface tw:px-[0.61538rem] tw:py-[0.53846rem] tw:font-semibold tw:text-cali-accent
                    tw:no-underline tw:hover:bg-cali-gold/10"
                  to={`/admin/relatorios/impressao/${encodeURIComponent(report.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir esta versão congelada"
                >{report.status === 'archived' ? 'Ver versão arquivada' : 'Ver versão'}</Link>
                {editable && <button type="button" className="delete tw:grid tw:size-[2.15385rem] tw:cursor-pointer tw:place-items-center tw:rounded-[0.61538rem]
                  tw:border tw:border-solid tw:border-[#ead8d4] tw:bg-[#fff8f6] tw:p-[0.38462rem] tw:text-[#9a4035]" onClick={() => onDelete(report.id)} aria-label="Excluir versão"><Trash2 size={14} /></button>}
                {renderCorrection(report.id)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
