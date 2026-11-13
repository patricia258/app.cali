import type { CSSProperties } from 'react';
import * as grid from '../../../calendar/calendarGridStyles';

type Item = {
  id: string;
  kind: 'event' | 'deadline' | 'request' | 'google';
  title: string;
  at: string;
  endsAt?: string | null;
  timeLabel: string;
  typeLabel: string;
  statusLabel: string;
  color?: string | null;
  textColor?: string | null;
};

type Props<T extends Item> = {
  view: 'week' | 'month';
  cursor: Date;
  weekDays: Date[];
  items: T[];
  onOpenItem: (item: T) => void;
  onShowList: () => void;
};

const hours = Array.from({ length: 13 }, (_, index) => index + 7);
const hourHeight = 64;
const dayStart = 7 * 60;
const dayEnd = 20 * 60;
const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
const labels = [
  { label: 'Reunião', color: '#6D2338' },
  { label: 'Prazo', color: '#A85B3A' },
  { label: 'Solicitação', color: '#B58C52' },
  { label: 'Google Agenda', color: '#4A90C2' },
];
const kindColor: Record<Item['kind'], string> = { event: labels[0].color, deadline: labels[1].color, request: labels[2].color, google: labels[3].color };

function dateKey(value: string | Date) {
  return dateFormat.format(value instanceof Date ? value : new Date(value));
}

function minutes(value: string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function paint(item: Item): CSSProperties & Record<`--${string}`, string> {
  const color = item.kind === 'google' && item.color ? item.color : kindColor[item.kind];
  return { '--event-color': color, '--event-soft': `${color}18`, '--event-foreground': item.textColor || '#ffffff' };
}

function placeTimedItems<T extends Item>(items: T[]) {
  const timed = items.filter(item => item.kind !== 'deadline').map(item => {
    const start = Math.max(dayStart, minutes(item.at));
    const end = item.endsAt && dateKey(item.endsAt) === dateKey(item.at) ? minutes(item.endsAt) : start + 60;
    return { item, start, end: Math.min(dayEnd, Math.max(start + 30, end)), column: 0 };
  }).filter(entry => entry.start < dayEnd).sort((left, right) => left.start - right.start || right.end - left.end);
  timed.forEach((entry, index) => {
    const occupied = timed.slice(0, index).filter(other => other.end > entry.start).map(other => other.column);
    while (occupied.includes(entry.column)) entry.column += 1;
  });
  return timed;
}

export function ClientTimelineCalendar<T extends Item>({ view, cursor, weekDays, items, onOpenItem, onShowList }: Props<T>) {
  const today = dateKey(new Date());
  const byDate = new Map<string, T[]>();
  for (const item of items) {
    const key = dateKey(item.at);
    const dateItems = byDate.get(key);
    if (dateItems) dateItems.push(item);
    else byDate.set(key, [item]);
  }
  const itemsOf = (day: Date) => byDate.get(dateKey(day)) ?? [];
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1, 12);
  const monthLength = new Date(year, month + 1, 0).getDate();
  const monthCellCount = monthLength + first.getDay() > 35 ? 42 : 35;
  const monthDays = Array.from({ length: monthCellCount }, (_, index) => new Date(year, month, 1 - first.getDay() + index, 12));
  const visibleDays = view === 'month' ? monthDays.filter(day => day.getMonth() === month) : weekDays;
  const total = visibleDays.reduce((sum, day) => sum + itemsOf(day).length, 0);

  return (
    <>
      <div className="tw:mt-4 tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white">
        {view === 'month' ? (
          <>
            <div className={grid.monthHead}>{dayNames.map(day => <span key={day} className={grid.monthWeekday}>{day}</span>)}</div>
            <div className={`calendar-month-grid ${grid.monthGrid}`}>
              {monthDays.map(day => {
                const dayItems = itemsOf(day);
                const isToday = dateKey(day) === today;
                return (
                  <article key={day.toISOString()} className={`${grid.monthCell} ${day.getMonth() !== month ? grid.monthOutside : ''} ${isToday ? grid.monthToday : ''}`}>
                    <span className={`tw:inline-grid tw:h-6 tw:min-w-6 tw:place-items-center tw:rounded-md tw:text-[0.71875rem] tw:font-bold tw:text-[#5f5650] ${isToday ? grid.todayNumber : ''}`}>{day.getDate()}</span>
                    <div className={grid.monthEvents}>
                      {dayItems.slice(0, 3).map(item => {
                        const personal = item.kind === 'google';
                        return (
                          <button type="button" key={item.id} className={`${grid.monthChip} tw:min-h-[1.6875rem] tw:gap-1.5 tw:px-1.5 tw:py-1 ${personal ? grid.personalEventColors : 'tw:workspace-night:text-[#f3eeeb]!'}`}
                            style={paint(item)} title={`${item.typeLabel} · ${item.title}`} onClick={() => onOpenItem(item)}>
                            <span className={`${grid.monthChipDot} ${personal ? 'tw:bg-white!' : ''}`} />
                            {item.kind !== 'deadline' && <time className={`${grid.monthChipTime} tw:text-[0.5625rem]! ${personal ? 'tw:text-inherit' : 'tw:text-cali-muted'}`}>{item.timeLabel}</time>}
                            <strong className="tw:min-w-0 tw:truncate tw:text-[0.625rem] tw:font-bold">{item.title}</strong>
                          </button>
                        );
                      })}
                      {dayItems.length > 3 && <button type="button" className={grid.monthMore} onClick={onShowList}>+{dayItems.length - 3} itens</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="tw:overflow-x-auto tw:[scrollbar-width:none]">
            <div className="tw:grid tw:min-w-[58.125rem] tw:grid-cols-[3.875rem_repeat(7,minmax(6.875rem,1fr))] tw:grid-rows-[3.375rem_auto_auto]">
              <div className={grid.weekCorner} />
              {weekDays.map(day => (
                <div key={day.toISOString()} className={grid.weekDayHead}>
                  <span className={grid.weekDayLabel}>{dayNames[day.getDay()]}</span>
                  <strong className={`${grid.weekDayNumber} ${dateKey(day) === today ? grid.todayNumber : ''}`}>{day.getDate()}</strong>
                </div>
              ))}
              <div className={`${grid.weekAllDay} tw:flex tw:items-center tw:justify-end tw:pr-2 tw:text-[0.65625rem] tw:font-bold tw:text-[#8a7c74]`}>Dia inteiro</div>
              {weekDays.map(day => (
                <div key={`all-${day.toISOString()}`} className={grid.weekAllDay}>
                  {itemsOf(day).filter(item => item.kind === 'deadline').map(item => (
                    <button type="button" key={item.id} className={`${grid.weekAllDayEvent} tw:font-semibold!`} style={paint(item)} title={`Prazo · ${item.title}`} onClick={() => onOpenItem(item)}>{item.title}</button>
                  ))}
                </div>
              ))}
              <div className={grid.weekAxis} style={{ height: hours.length * hourHeight }}>
                {hours.map(hour => <span key={hour} className="tw:absolute tw:right-2 tw:translate-y-[0.4375rem] tw:text-[0.65625rem] tw:font-bold tw:text-[#8a7c74]" style={{ top: (hour - 7) * hourHeight }}>{String(hour).padStart(2, '0')}:00</span>)}
              </div>
              {weekDays.map(day => (
                <div key={`lane-${day.toISOString()}`} className={`calendar-week-lane ${grid.weekLane}`} style={{ height: hours.length * hourHeight }}>
                  {hours.map(hour => <div key={hour} className={grid.weekHour} style={{ top: (hour - 7) * hourHeight, height: hourHeight }} />)}
                  {placeTimedItems(itemsOf(day)).map(({ item, start, end, column }) => {
                    const height = (end - start) / 60 * hourHeight;
                    const offset = Math.min(column * 11, 33);
                    const personal = item.kind === 'google';
                    return (
                      <button type="button" key={item.id} className={`${grid.weekEvent} tw:gap-px tw:px-1.5 tw:py-1 ${personal ? grid.personalEventColors : 'tw:workspace-night:text-[#f3eeeb]!'} ${height < 36 ? grid.weekEventCompact : ''}`}
                        style={{ ...paint(item), top: (start - dayStart) / 60 * hourHeight, height: Math.max(3, height - 2), left: 3 + offset, width: `calc(100% - ${7 + offset}px)`, zIndex: 1 + column }}
                        title={`${item.typeLabel} · ${item.timeLabel} · ${item.title}`} onClick={() => onOpenItem(item)}>
                        <strong className="tw:truncate tw:text-[0.6875rem]/[1.1]">{item.title}</strong>
                        <time className="tw:truncate tw:text-[0.625rem]/[1.1] tw:text-inherit tw:opacity-85">{item.timeLabel}</time>
                        <small className="tw:truncate tw:text-[0.625rem]/[1.1] tw:text-inherit tw:opacity-85">{item.statusLabel}</small>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
        <footer className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:border-0 tw:border-t tw:border-solid tw:border-[#efe6de] tw:px-[1.125rem] tw:py-3 tw:text-[0.6875rem] tw:text-[#67574c]">
          <div className="tw:flex tw:flex-wrap tw:gap-x-4 tw:gap-y-2">
            {labels.map(({ label, color }) => (
              <span key={label} className="tw:inline-flex tw:items-center tw:gap-2"><i className="tw:size-2 tw:rounded-full" style={{ backgroundColor: color }} />{label}</span>
            ))}
          </div>
          <span><b className="tw:mr-1 tw:text-[0.8125rem] tw:text-cali-ink">{total}</b> {total === 1 ? 'compromisso' : 'compromissos'} no período</span>
        </footer>
      </div>
      <div className="tw:mt-[1.08rem] tw:text-[.77rem]/[1.55] tw:text-[#98897e]">Este calendário mostra compromissos e entregas da CALI, não jornadas de ponto, férias ou escala de colaboradores.</div>
    </>
  );
}
