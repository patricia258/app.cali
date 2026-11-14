import { X } from 'lucide-react';
import type { ClientRow } from '../../../../domain/company';

const statusColors: Record<ClientRow['status'], string> = {
  active: 'tw:border-[#d3e4d7] tw:bg-[#eaf3ed] tw:text-[#44785c]',
  paused: 'tw:border-[#f0dfc0] tw:bg-[#fff2dc] tw:text-[#97672f]',
  archived: 'tw:border-[#f0dfc0] tw:bg-[#fff2dc] tw:text-[#97672f]',
  blocked: 'tw:border-[#f0d5d8] tw:bg-[#fae9e9] tw:text-[#b7495d]',
  closed: 'tw:border-[#f0d5d8] tw:bg-[#fae9e9] tw:text-[#b7495d]',
};

type CompanyProfileHeaderProps = {
  company: Pick<ClientRow, 'name' | 'logoUrl' | 'segment' | 'service' | 'drive' | 'status'>;
  initials: string;
  status: string;
  onClose: () => void;
};

export function CompanyProfileHeader({ company, initials, status, onClose }: CompanyProfileHeaderProps) {
  return (
    <header className="tw:flex tw:items-center tw:gap-[1.692rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#e8ded7] tw:bg-[linear-gradient(100deg,#f8f2ee,#fff)] tw:px-[2.462rem] tw:py-[2.154rem] tw:max-[45rem]:gap-[.615rem] tw:max-[45rem]:p-[1.308rem]">
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:items-center tw:gap-[1.231rem]">
        <div className="tw:grid tw:size-[4.462rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[.923rem] tw:border tw:border-solid tw:border-[#e0cdc1] tw:bg-[#f2e8e0] tw:text-[1.385rem] tw:font-extrabold tw:text-cali-brand">
          {company.logoUrl ? <img src={company.logoUrl} alt="" className="tw:size-full tw:object-contain" /> : initials}
        </div>
        <div className="tw:min-w-0">
          <small className="tw:text-[.769rem] tw:font-extrabold tw:tracking-[.14em] tw:text-cali-gold">GESTÃO DA CONTA</small>
          <h2 className="tw:mx-0 tw:my-[.385rem] tw:text-[1.846rem] tw:text-[#332d2b] tw:wrap-break-word">{company.name}</h2>
          <p className="tw:m-0 tw:text-[#877d78]">{company.service} · {company.segment || 'Segmento não informado'}</p>
        </div>
      </div>
      <div className="tw:flex tw:gap-[.692rem] tw:max-[45rem]:hidden">
        <span className={`tw:rounded-full tw:border tw:border-solid tw:px-[.923rem] tw:py-[.615rem] tw:text-[.846rem] ${statusColors[company.status]}`}>{status}</span>
        <span className="tw:rounded-full tw:border tw:border-solid tw:border-[#e6d9d0] tw:px-[.923rem] tw:py-[.615rem] tw:text-[.846rem] tw:text-[#725952]">Drive {company.drive.toLowerCase()}</span>
      </div>
      <button
        type="button"
        aria-label="Fechar gestão"
        onClick={onClose}
        className="tw:grid tw:shrink-0 tw:place-items-center tw:rounded-[.615rem] tw:border-0 tw:bg-[#f3e9e5] tw:p-[.615rem] tw:text-cali-brand"
      >
        <X aria-hidden="true" className="tw:size-[1.538rem]" />
      </button>
    </header>
  );
}
