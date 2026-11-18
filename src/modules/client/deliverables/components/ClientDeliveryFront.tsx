import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ClientDeliveryWorkstream } from '../../../../api/projects/client-delivery';
import { EmptyState } from '../../../../components/ds/EmptyState';

type ClientDeliveryFrontProps = {
  front: ClientDeliveryWorkstream;
  protocol?: string | null;
  months: readonly number[];
  count: number;
  expanded: boolean;
  useLimeMark: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ClientDeliveryFront({
  front,
  protocol,
  months,
  count,
  expanded,
  useLimeMark,
  onToggle,
  children,
}: ClientDeliveryFrontProps) {
  const firstMonth = front.monthStart || 1;
  const lastMonth = front.monthEnd || firstMonth;

  return (
    <section className="tw:@container tw:min-w-0 tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface">
      <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:items-center tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:bg-cali-surface-soft tw:px-5 tw:py-4.5 tw:@min-[56rem]:grid-cols-[minmax(16.15rem,1.5fr)_minmax(21.54rem,2fr)_auto]">
        <button
          type="button"
          className="tw:group tw:flex tw:w-full tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-4 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-cali-red-strong tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="tw:grid tw:size-12 tw:shrink-0 tw:place-items-center tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-sand-surface tw:group-hover:border-cali-gold tw:group-hover:bg-cali-neutral-surface">
            <span
              aria-hidden="true"
              className={`tw:size-6 tw:bg-cali-brand tw:mask-contain tw:mask-center tw:mask-no-repeat ${useLimeMark ? "tw:mask-[url('/brand/cali-lime-mark.svg')]" : "tw:mask-[url('/brand/cali-oak-mark.svg')]"}`}
            />
          </span>
          <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1 tw:wrap-anywhere">
            <small className="tw:text-xs/[1.25] tw:tracking-[.031rem] tw:text-cali-sand-text">
              {front.protocol || protocol || 'FRENTE CALI'}
            </small>
            <strong className="tw:text-base/[1.3] tw:text-cali-neutral-strong tw:@min-[56rem]:text-lg/[1.3]">
              {front.name}
            </strong>
            <span className="tw:text-xs/[1.4] tw:text-cali-sand-text">
              {front.objective ||
                `Frente contratada · clique para ${expanded ? 'recolher' : 'visualizar'} entregáveis`}
            </span>
          </span>
          {expanded ? (
            <ChevronDown size={15} className="tw:ml-1.5 tw:shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight size={15} className="tw:ml-1.5 tw:shrink-0" aria-hidden="true" />
          )}
        </button>

        <div className="tw:min-w-0 tw:overflow-x-auto">
          <div
            className="tw:grid tw:items-center tw:gap-1"
            style={{ gridTemplateColumns: `repeat(${months.length}, minmax(1.92rem, 1fr))` }}
          >
            {months.map((month) => {
              const active = month >= firstMonth && month <= lastMonth;
              return (
                <span
                  key={month}
                  className={`tw:grid tw:h-8 tw:place-items-center tw:border-0 tw:border-r tw:border-solid tw:border-cali-sand-line tw:text-xs ${active ? 'tw:rounded-lg tw:bg-cali-brand tw:text-cali-neutral-surface' : 'tw:text-cali-sand-text'}`}
                >
                  M{month}
                </span>
              );
            })}
          </div>
        </div>
        <span className="tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-gold-line tw:bg-cali-orange-surface tw:p-3 tw:text-xs tw:whitespace-nowrap tw:text-cali-orange-inverse">
          {count} {count === 1 ? 'entregável' : 'entregáveis'}
        </span>
      </div>

      {expanded &&
        (count ? (
          <div className="tw:grid tw:@min-[56rem]:grid-cols-[2.77rem_minmax(0,1fr)_10.62rem_7.38rem_10.15rem_8rem_1.15rem] tw:@min-[56rem]:gap-x-4.5">
            <div
              className="tw:col-span-full tw:hidden tw:items-center tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-6 tw:py-3 tw:text-xs tw:font-extrabold tw:tracking-[.06em] tw:text-cali-muted tw:uppercase tw:@min-[56rem]:grid tw:@min-[56rem]:grid-cols-subgrid"
              aria-hidden="true"
            >
              <span />
              <span>Entregável</span>
              <span>Subtarefas</span>
              <span>Complexidade</span>
              <span className="tw:text-center">Situação</span>
              <span className="tw:text-right">Prazo</span>
              <span />
            </div>
            {children}
          </div>
        ) : (
          <EmptyState as="p" variant="workflow">
            Nenhum entregável compartilhado nesta frente ainda.
          </EmptyState>
        ))}
    </section>
  );
}
