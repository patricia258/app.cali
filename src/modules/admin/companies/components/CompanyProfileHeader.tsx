import { X } from 'lucide-react';
import type { ClientRow } from '../../../../domain/company';

const statusColors: Record<ClientRow['status'], string> = {
  active: 'tw:border-cali-green-soft tw:bg-cali-success-surface tw:text-cali-green-accent',
  paused: 'tw:border-cali-warning-line tw:bg-cali-warning-surface tw:text-cali-warning',
  archived: 'tw:border-cali-warning-line tw:bg-cali-warning-surface tw:text-cali-warning',
  blocked: 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger',
  closed: 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger',
};

type CompanyProfileHeaderProps = {
  company: Pick<ClientRow, 'name' | 'logoUrl' | 'segment' | 'service' | 'drive' | 'status'>;
  initials: string;
  status: string;
  onClose: () => void;
};

export function CompanyProfileHeader({ company, initials, status, onClose }: CompanyProfileHeaderProps) {
  return (
    <header className="tw:flex tw:items-center tw:gap-7 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:bg-[linear-gradient(100deg,var(--cali-color-sand-soft),var(--cali-color-neutral-surface))] tw:px-10 tw:py-8.5 tw:max-[45rem]:gap-2.5 tw:max-[45rem]:p-5">
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:items-center tw:gap-5">
        <div className="tw:grid tw:size-18 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[.923rem] tw:border tw:border-solid tw:border-cali-neutral-line tw:bg-cali-neutral-soft tw:text-cali-title-sm tw:font-extrabold tw:text-cali-brand">
          {company.logoUrl ? <img src={company.logoUrl} alt="" className="tw:size-full tw:object-contain" /> : initials}
        </div>
        <div className="tw:min-w-0">
          <small className="tw:text-xs tw:font-extrabold tw:tracking-[.14em] tw:text-cali-gold">GESTÃO DA CONTA</small>
          <h2 className="tw:mx-0 tw:my-1.5 tw:text-3xl tw:text-cali-neutral-strong tw:wrap-break-word">{company.name}</h2>
          <p className="tw:m-0 tw:text-cali-sand-text">{company.service} · {company.segment || 'Segmento não informado'}</p>
        </div>
      </div>
      <div className="tw:flex tw:gap-3 tw:max-[45rem]:hidden">
        <span className={`tw:rounded-full tw:border tw:border-solid tw:px-3.5 tw:py-2.5 tw:text-sm ${statusColors[company.status]}`}>{status}</span>
        <span className="tw:rounded-full tw:border tw:border-solid tw:border-cali-sand-line tw:px-3.5 tw:py-2.5 tw:text-sm tw:text-cali-sand-strong">Drive {company.drive.toLowerCase()}</span>
      </div>
      <button
        type="button"
        aria-label="Fechar gestão"
        onClick={onClose}
        className="tw:grid tw:shrink-0 tw:place-items-center tw:rounded-cali-compact-control tw:border-0 tw:bg-cali-neutral-soft tw:p-2.5 tw:text-cali-brand"
      >
        <X aria-hidden="true" className="tw:size-6" />
      </button>
    </header>
  );
}
