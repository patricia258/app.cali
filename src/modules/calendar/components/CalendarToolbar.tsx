import { ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import { calendarTypeMeta, type CalendarEventType, type CalendarView, type WorkspaceCalendarEvent } from '../../../domain/calendar';
import type { CompanyOption } from '../adminCalendarData';

const views: Record<CalendarView, string> = { week: 'Semana', month: 'Mês', agenda: 'Lista' };
const eventTypes = Object.keys(calendarTypeMeta) as CalendarEventType[];
const periodButton = 'tw:inline-grid tw:size-9 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:p-0 tw:text-cali-brand tw:shadow-none tw:hover:bg-(--theme-accent-soft)';
const smallButton = 'tw:cursor-pointer tw:border-0 tw:font-[inherit]! tw:text-[0.6875rem]!';

type Props = {
  view: CalendarView;
  label: string;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (delta: number) => void;
  onToday: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  companyId: string;
  onCompanyChange: (id: string) => void;
  companies: CompanyOption[];
  types: Set<CalendarEventType>;
  onToggleType: (type: CalendarEventType) => void;
  onReset: () => void;
  events: WorkspaceCalendarEvent[];
};

export function CalendarToolbar(props: Props) {
  const { view, label, onViewChange, onNavigate, onToday, query, onQueryChange, companyId, onCompanyChange, companies, types, onToggleType, onReset, events } = props;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const hasFilters = companyId !== 'all' || types.size !== eventTypes.length;

  return (
    <section aria-label="Controles da agenda" className="tw:relative tw:z-40 tw:mb-4 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-x-5 tw:gap-y-3 tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:px-3.5 tw:py-3 tw:max-[56.25rem]:items-start">
      <div aria-label="Visualização" role="group" className="tw:inline-flex tw:h-[2.4375rem] tw:items-center tw:gap-0.5 tw:rounded-lg tw:bg-[#f6f0eb] tw:p-1 tw:max-[41.25rem]:w-full">
        {(Object.keys(views) as CalendarView[]).map(item => (
          <button type="button" key={item} aria-pressed={view === item}
            className={`${smallButton} tw:min-w-[3.625rem] tw:rounded-md tw:px-3 tw:py-2 tw:shadow-none tw:max-[41.25rem]:flex-1 ${view === item ? 'tw:bg-white tw:font-bold! tw:text-[#322f2c] tw:shadow-[0_1px_3px_#0000000f]' : 'tw:bg-transparent tw:text-[#857870]'}`}
            onClick={() => onViewChange(item)}>{views[item]}</button>
        ))}
      </div>
      <div className="tw:inline-flex tw:min-w-0 tw:items-center tw:gap-2 tw:max-[41.25rem]:w-full tw:max-[41.25rem]:flex-wrap">
        <button type="button" className={periodButton} aria-label="Período anterior" onClick={() => onNavigate(-1)}><ChevronLeft size={16} /></button>
        <strong className="tw:ml-1.5 tw:min-w-36 tw:text-center tw:text-xs tw:whitespace-nowrap tw:text-cali-text tw:max-[41.25rem]:-order-1 tw:max-[41.25rem]:mb-1 tw:max-[41.25rem]:ml-0 tw:max-[41.25rem]:w-full">{label}</strong>
        <button type="button" className={periodButton} aria-label="Próximo período" onClick={() => onNavigate(1)}><ChevronRight size={16} /></button>
        <button type="button" className="tw:inline-grid tw:min-h-[2.375rem] tw:min-w-9 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-3 tw:py-0 tw:text-[0.6875rem]! tw:font-bold! tw:text-cali-brand tw:hover:bg-(--theme-accent-soft)" onClick={onToday}>Hoje</button>
      </div>
      <div className="tw:ml-auto tw:inline-flex tw:min-w-0 tw:flex-[1_1_33.75rem] tw:items-center tw:justify-end tw:gap-2.5 tw:max-[56.25rem]:ml-0 tw:max-[56.25rem]:w-full tw:max-[56.25rem]:flex-wrap tw:max-[56.25rem]:justify-start tw:max-[41.25rem]:grid tw:max-[41.25rem]:grid-cols-1">
        <label className="tw:m-0! tw:flex tw:min-h-[2.4375rem] tw:min-w-50 tw:flex-[0_1_16.25rem] tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-2.5 tw:text-[#978980] tw:focus-within:border-cali-brand tw:max-[43.75rem]:min-w-0 tw:max-[41.25rem]:w-full">
          <Search size={16} aria-hidden="true" />
          <input aria-label="Buscar evento ou protocolo" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Buscar evento ou protocolo"
            className="tw:h-[2.1875rem]! tw:min-h-0! tw:w-full tw:min-w-0 tw:flex-1 tw:border-0! tw:bg-transparent! tw:p-0! tw:text-[0.6875rem]! tw:text-cali-text! tw:shadow-none! tw:outline-none" />
        </label>
        <div className="tw:relative tw:z-20 tw:flex-none tw:max-[43.75rem]:justify-self-start">
          <button type="button" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(value => !value)}
            className={`tw:inline-flex tw:min-h-[2.4375rem] tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-solid tw:bg-white tw:px-3 tw:text-[0.6875rem]! tw:font-bold! tw:text-cali-brand tw:hover:border-cali-gold ${filtersOpen || hasFilters ? 'tw:border-cali-brand' : 'tw:border-[#e5d9d0]'}`}>
            <Filter size={18} aria-hidden="true" /> Filtros
            {hasFilters && <span className="tw:size-1.5 tw:rounded-full tw:bg-cali-gold" />}
          </button>
          {filtersOpen && (
            <div id={filtersId} className="tw:absolute tw:top-[calc(100%+0.5rem)] tw:right-0 tw:z-30 tw:w-[min(24.375rem,calc(100vw-1.75rem))] tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:p-4 tw:text-cali-text tw:shadow-[0_18px_60px_#28172426] tw:max-[43.75rem]:right-auto tw:max-[43.75rem]:left-0">
              <div className="tw:mb-3.5 tw:flex tw:items-center tw:justify-between tw:text-sm">
                <strong>Filtrar agenda</strong>
                <button type="button" className="tw:grid tw:size-7 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-transparent tw:text-cali-text"
                  onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><X size={17} /></button>
              </div>
              <label className="tw:grid tw:gap-1.5 tw:text-[0.6875rem] tw:font-bold tw:text-cali-muted">
                Cliente
                <select value={companyId} onChange={event => onCompanyChange(event.target.value)}
                  className="tw:min-h-[2.4375rem] tw:w-full tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-2.5 tw:text-cali-text">
                  <option value="all">Todos os clientes</option>
                  {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </label>
              <strong className="tw:mt-4 tw:mb-2 tw:block tw:text-[0.6875rem]">Tipos de evento</strong>
              <div className="tw:grid tw:grid-cols-2 tw:gap-1">
                {eventTypes.map(type => (
                  <button type="button" key={type} aria-pressed={types.has(type)} onClick={() => onToggleType(type)}
                    className="tw:flex tw:min-h-9 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-(--theme-surface-soft) tw:px-2 tw:py-1.5 tw:text-left tw:text-cali-text tw:opacity-55 tw:aria-pressed:border-[color-mix(in_srgb,var(--theme-gold)_45%,var(--theme-line))] tw:aria-pressed:opacity-100">
                    <span className="tw:size-2 tw:shrink-0 tw:rounded-full" style={{ backgroundColor: calendarTypeMeta[type].color }} />
                    <strong className="tw:flex-1 tw:text-[0.6875rem]">{calendarTypeMeta[type].label}</strong>
                    <small className="tw:text-[0.625rem] tw:text-cali-muted">{events.filter(event => event.type === type && !event.cancelledAt).length}</small>
                  </button>
                ))}
              </div>
              <button type="button" onClick={onReset} className="tw:mt-3 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:px-0 tw:py-1 tw:text-[0.6875rem]! tw:font-bold! tw:text-cali-accent">Limpar filtros</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
