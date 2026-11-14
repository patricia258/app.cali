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
    <section className="tw:@container tw:min-w-0 tw:overflow-hidden tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e8ddd4] tw:bg-white">
      <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:items-center tw:gap-[1.08rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#e6d9cd] tw:bg-[#fbf7f3] tw:px-[1.31rem] tw:py-[1.15rem] tw:@min-[56rem]:grid-cols-[minmax(16.15rem,1.5fr)_minmax(21.54rem,2fr)_auto]">
        <button
          type="button"
          className="tw:group tw:flex tw:w-full tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-[1rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[#6a3b48] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="tw:grid tw:size-[3rem] tw:shrink-0 tw:place-items-center tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#e9d8c2] tw:bg-[#fffaf5] tw:group-hover:border-cali-gold tw:group-hover:bg-white">
            <span
              aria-hidden="true"
              className={`tw:size-[1.54rem] tw:bg-cali-brand tw:mask-contain tw:mask-center tw:mask-no-repeat ${useLimeMark ? "tw:mask-[url('/brand/cali-lime-mark.svg')]" : "tw:mask-[url('/brand/cali-oak-mark.svg')]"}`}
            />
          </span>
          <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-[.308rem] tw:wrap-anywhere">
            <small className="tw:text-[.77rem]/[1.25] tw:tracking-[.031rem] tw:text-[#8e7e72]">
              {front.protocol || protocol || 'FRENTE CALI'}
            </small>
            <strong className="tw:text-[1rem]/[1.3] tw:text-[#352d2a] tw:@min-[56rem]:text-[1.08rem]/[1.3]">
              {front.name}
            </strong>
            <span className="tw:text-[.77rem]/[1.4] tw:text-[#8e7e72]">
              {front.objective ||
                `Frente contratada · clique para ${expanded ? 'recolher' : 'visualizar'} entregáveis`}
            </span>
          </span>
          {expanded ? (
            <ChevronDown size={15} className="tw:ml-[.385rem] tw:shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight size={15} className="tw:ml-[.385rem] tw:shrink-0" aria-hidden="true" />
          )}
        </button>

        <div className="tw:min-w-0 tw:overflow-x-auto">
          <div
            className="tw:grid tw:items-center tw:gap-[.231rem]"
            style={{ gridTemplateColumns: `repeat(${months.length}, minmax(1.92rem, 1fr))` }}
          >
            {months.map((month) => {
              const active = month >= firstMonth && month <= lastMonth;
              return (
                <span
                  key={month}
                  className={`tw:grid tw:h-[2rem] tw:place-items-center tw:border-0 tw:border-r tw:border-solid tw:border-[#e9e0d9] tw:text-[.77rem] ${active ? 'tw:rounded-[.538rem] tw:bg-cali-brand tw:text-white' : 'tw:text-[#ad9c90]'}`}
                >
                  M{month}
                </span>
              );
            })}
          </div>
        </div>
        <span className="tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#ead4b7] tw:bg-[#fff1df] tw:p-[.77rem] tw:text-[.77rem] tw:whitespace-nowrap tw:text-[#6d3d2d]">
          {count} {count === 1 ? 'entregável' : 'entregáveis'}
        </span>
      </div>

      {expanded &&
        (count ? (
          <div className="tw:grid tw:@min-[56rem]:grid-cols-[2.77rem_minmax(0,1fr)_10.62rem_7.38rem_10.15rem_8rem_1.15rem] tw:@min-[56rem]:gap-x-[1.154rem]">
            <div
              className="tw:col-span-full tw:hidden tw:items-center tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4dd] tw:bg-[#faf7f4] tw:px-[1.46rem] tw:py-[.69rem] tw:text-[.73rem] tw:font-extrabold tw:tracking-[.06em] tw:text-[#988980] tw:uppercase tw:@min-[56rem]:grid tw:@min-[56rem]:grid-cols-subgrid"
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
