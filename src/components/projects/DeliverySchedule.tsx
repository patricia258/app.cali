import type { ReactNode } from 'react';
import type { DeliverableStatus } from '../../domain/projects';

const statusColors: Partial<Record<DeliverableStatus, string>> = {
  approved: 'tw:border-[#bfe4d4] tw:bg-[#d8f0e7] tw:text-[#32836a]',
  client_review: 'tw:border-[#d6c1ec] tw:bg-[#e5d7f7] tw:text-[#754da1]',
  internal_review: 'tw:border-[#d6c1ec] tw:bg-[#e5d7f7] tw:text-[#754da1]',
  not_started: 'tw:border-[#ad4c70] tw:bg-[#ad4c70] tw:text-white',
  adjustment_requested: 'tw:border-[#ad4c70] tw:bg-[#ad4c70] tw:text-white',
  rebriefing: 'tw:border-[#ad4c70] tw:bg-[#ad4c70] tw:text-white',
};

function tick(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(timestamp)).replace('.', '');
}

type ScheduleItem = {
  id: string;
  title: string;
  workstream?: string | null;
  dueAt?: string | null;
  status: DeliverableStatus;
};

export function DeliverySchedule<Item extends ScheduleItem>({ items, labels, bounds = [], formatDue = tick, empty, onOpen }: {
  items: Item[];
  labels: Record<DeliverableStatus, string>;
  bounds?: (string | null | undefined)[];
  formatDue?: (date: number) => string;
  empty: ReactNode;
  onOpen: (item: Item) => void;
}) {
  const dates = [
    ...items.map(({ dueAt }) => Date.parse(dueAt ?? '')),
    ...bounds.map((value) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).getTime() : NaN),
  ].filter(Number.isFinite);
  const start = Math.min(...dates);
  const span = Math.max(86_400_000, Math.max(...dates) - start);
  const timelineTicks = dates.length > 0 ? [
    { label: 'start', date: start },
    { label: 'middle', date: start + span / 2 },
    { label: 'end', date: Math.max(...dates) },
  ] : [];
  const ordered = items.slice().sort((a, b) => String(a.dueAt || '9').localeCompare(String(b.dueAt || '9')));

  return (
    <section className="tw:min-w-0 tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:p-[1.77rem]">
      <header>
        <small className="tw:text-[.77rem] tw:leading-[inherit] tw:font-extrabold tw:tracking-[.12em] tw:text-[#a77e52]">CRONOGRAMA</small>
        <h2 className="tw:my-[.23rem] tw:text-[1.15rem] tw:leading-[inherit]">Prazos das entregas</h2>
        <p className="tw:m-0 tw:text-[.85rem] tw:leading-[inherit] tw:text-[#978980]">Cada entrega no ponto do período em que está prevista. Clique para abrir.</p>
      </header>
      {ordered.length > 0 ? (
        <div className="tw:mt-6" aria-label="Prazos e andamento das entregas">
          <div className="tw:grid tw:grid-cols-[33%_repeat(3,1fr)] tw:bg-[#faf7f3] tw:p-3.5 tw:text-[.69rem] tw:leading-[inherit] tw:font-bold tw:tracking-[.054rem] tw:text-[#ac9d91] tw:[@media(max-width:43.75rem)]:grid-cols-1">
            <span>ENTREGA / STATUS</span>
            <span className="tw:[@media(max-width:43.75rem)]:hidden">INÍCIO</span>
            <span className="tw:[@media(max-width:43.75rem)]:hidden">MEIO</span>
            <span className="tw:[@media(max-width:43.75rem)]:hidden">CONCLUSÃO</span>
          </div>
          {ordered.map((item) => {
            const due = Date.parse(item.dueAt ?? '');
            const position = Number.isFinite(due) ? Math.max(4, Math.min(84, (due - start) / span * 100)) : null;
            return (
              <button key={item.id} type="button" onClick={() => onOpen(item)}
                className="tw:grid tw:min-h-[3.69rem] tw:w-full tw:cursor-pointer tw:grid-cols-[33%_1fr] tw:items-center tw:border-0 tw:border-b tw:border-solid tw:border-[#efe7df] tw:bg-transparent tw:p-0 tw:text-left tw:text-[#302b2b] tw:[@media(max-width:43.75rem)]:grid-cols-[minmax(0,1fr)_auto] tw:[@media(max-width:43.75rem)]:gap-2">
                <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
                  <strong className="tw:text-[.846rem] tw:leading-[inherit]">{item.title}</strong>
                  <small className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#8e837b]">{item.workstream || 'Frente CALI'} · {labels[item.status]}</small>
                </div>
                <div className="tw:relative tw:flex tw:h-full tw:items-center tw:justify-end tw:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(25%-1px),#e6d8c9_calc(25%-1px),#e6d8c9_25%)] tw:[@media(max-width:43.75rem)]:bg-none">
                  {position === null ? <span className="tw:px-2 tw:text-[.77rem] tw:text-[#8e837b]">Prazo a definir</span> : (
                    <time className={`tw:absolute tw:top-1/2 tw:-translate-y-1/2 tw:rounded-full tw:border tw:border-solid tw:p-2.5 tw:text-[.69rem] tw:leading-[inherit] tw:font-bold tw:whitespace-nowrap tw:[@media(max-width:43.75rem)]:static tw:[@media(max-width:43.75rem)]:translate-y-0 ${statusColors[item.status] ?? 'tw:border-[#e5d1b0] tw:bg-[#f7e9d7] tw:text-[#896127]'}`}
                      dateTime={item.dueAt ?? undefined} style={{ left: `clamp(0rem, ${position}%, calc(100% - 9.23rem))` }}>{formatDue(due)}</time>
                  )}
                </div>
              </button>
            );
          })}
          {dates.length > 0 && <div className="tw:mt-3 tw:ml-[33%] tw:flex tw:justify-between tw:text-[.69rem] tw:leading-[inherit] tw:text-[#aa998d] tw:[@media(max-width:43.75rem)]:hidden" aria-hidden="true">
            {timelineTicks.map(({ label, date }) => <time key={label}>{tick(date)}</time>)}
          </div>}
        </div>
      ) : empty}
    </section>
  );
}
