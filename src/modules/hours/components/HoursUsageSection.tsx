import { Eye, EyeOff, Filter } from 'lucide-react';
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { minutesLabel } from '../../../lib/capacity';
import { HoursMoreButton } from './HoursMoreButton';
import { HoursCompanyLogo } from './HoursCompanyLogo';

type UsageCompany = {
  id: string;
  name: string;
  logoUrl?: string | null;
  logoFallbackUrl?: string | null;
  servicePlan?: string | null;
  showHoursToClient: boolean;
};

type UsageRow<Company extends UsageCompany> = {
  company: Company;
  live: number;
  consumed: number;
  contracted: number;
  percent: number | null;
};

const servicePlans: Record<string, string> = {
  partner: 'CALI Partner',
  full: 'CALI Full',
  build_essential: 'CALI Build Essencial',
  build_complete: 'CALI Build Completo',
};

function HoursUsageCard<Company extends UsageCompany>({ row, onVisibility, saving }: {
  row: UsageRow<Company>;
  onVisibility?: (company: Company) => void;
  saving: boolean;
}) {
  const percent = row.percent ?? 0;
  const company = row.company;
  const plan = company.servicePlan ?? '';
  const visible = company.showHoursToClient;
  return (
    <article className="tw:grid tw:grid-cols-[auto_minmax(0,1fr)_auto] tw:items-center tw:gap-x-4 tw:gap-y-3 tw:rounded-xl tw:border tw:border-solid tw:border-[#eee2d9] tw:bg-white tw:p-4">
      <HoursCompanyLogo name={company.name} logoUrl={company.logoUrl} logoFallbackUrl={company.logoFallbackUrl} />
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
        <strong className="tw:truncate tw:text-[.923rem] tw:leading-[inherit]">{company.name}</strong>
        <small className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#a39790]">{servicePlans[plan] ?? (plan || 'Conta CALI')}</small>
      </div>
      <strong className="tw:text-right tw:text-[1.077rem] tw:leading-[inherit] tw:text-cali-brand">{row.percent === null ? '—' : `${Math.round(percent)}%`}</strong>
      <div className="tw:col-span-full">
        <div className="tw:mb-1.5 tw:h-2 tw:overflow-hidden tw:rounded-md tw:bg-[#f1e9e2]">
          <span className={`tw:block tw:h-full tw:rounded-md ${percent >= 100 ? 'tw:bg-[#b7495d]' : percent >= 80 ? 'tw:bg-[#b58c52]' : 'tw:bg-[#8a4b60]'}`} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <small className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#a39790]">
          {minutesLabel(row.consumed)}{row.contracted ? ` de ${minutesLabel(row.contracted)}` : ' · sem carga contratada'}{row.live ? ` · ${minutesLabel(row.live)} em andamento` : ''}
        </small>
      </div>
      {onVisibility && <Button
        variant="unstyled"
        type="button"
        className={`tw:col-span-full tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:justify-self-start tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-2 tw:text-[.77rem] tw:leading-[inherit] tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-not-allowed tw:disabled:opacity-45 ${visible ? 'tw:border-[#d6e8dd] tw:bg-[#eaf3ed] tw:text-[#42785a]' : 'tw:border-[#eadfd5] tw:bg-[#fbf7f4] tw:text-[#857870]'}`}
        title={visible ? 'O cliente acompanha as horas compartilháveis a partir deste mês' : 'O cliente não vê as horas a partir deste mês'}
        disabled={saving}
        onClick={() => onVisibility(company)}
      >
        {visible ? <Eye size={13} /> : <EyeOff size={13} />}{visible ? 'Visível ao cliente' : 'Oculto ao cliente'}
      </Button>}
    </article>
  );
}

export function HoursUsageSection<Company extends UsageCompany>({
  rows, count, query, onQuery, attention, onAttention, pagination, onVisibility, saving,
}: {
  rows: UsageRow<Company>[];
  count: number;
  query: string;
  onQuery: (query: string) => void;
  attention: boolean;
  onAttention: () => void;
  pagination?: { text: string; toggle: () => void };
  onVisibility?: (company: Company) => void;
  saving: boolean;
}) {
  return (
    <section className="ap-pane" aria-labelledby="hours-usage-title">
      <div className="ap-pane-head">
        <div className="tw:flex tw:flex-col tw:gap-1">
          <h2 id="hours-usage-title">Consumo por cliente</h2>
          <span>{count} {count === 1 ? 'conta' : 'contas'} · ordenadas pelo maior uso</span>
        </div>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.5">
          <label className="tw:flex tw:min-w-[15.385rem] tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-3 tw:text-[#978980]">
            <Filter size={13} />
            <input className="tw:w-full tw:min-w-0 tw:border-0 tw:bg-transparent tw:px-1 tw:py-3 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#67574c]" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar conta" aria-label="Buscar conta" />
          </label>
          <Button
            variant="unstyled"
            type="button"
            aria-pressed={attention}
            className={`tw:inline-flex tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:px-3.5 tw:py-3 tw:text-[.846rem] tw:leading-[inherit] tw:font-semibold ${attention ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#e7ddd5] tw:bg-white tw:text-[#857870]'}`}
            onClick={onAttention}
          >
            Acima de 80%
          </Button>
        </div>
      </div>
      <div className="tw:mt-5 tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(100%,22.31rem),1fr))] tw:gap-4" data-hours-usage-list="">
        {rows.map((row) => <HoursUsageCard key={row.company.id} row={row} onVisibility={onVisibility} saving={saving} />)}
      </div>
      {rows.length === 0 && <EmptyState as="p" variant="admin">Nenhuma conta corresponde ao filtro.</EmptyState>}
      {pagination && <HoursMoreButton onClick={pagination.toggle}>{pagination.text}</HoursMoreButton>}
    </section>
  );
}
