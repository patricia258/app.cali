import { calendarTypeMeta, type CalendarEventType } from '../../../domain/calendar';

type Props = { types: Set<CalendarEventType>; showGoogle: boolean; eventCount: number };

export function CalendarLegend({ types, showGoogle, eventCount }: Props) {
  return (
    <footer className="tw:order-2 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-4.5 tw:py-3">
      <div className="tw:flex tw:flex-wrap tw:gap-x-4 tw:gap-y-2 tw:text-cali-label tw:text-cali-muted">
        {[...types].map(type => (
          <span key={type} className="tw:flex tw:items-center tw:gap-2">
            <i className="tw:size-2 tw:shrink-0 tw:rounded-full" style={{ backgroundColor: calendarTypeMeta[type].color }} />{calendarTypeMeta[type].label}
          </span>
        ))}
        {showGoogle && <span className="tw:flex tw:items-center tw:gap-2"><i className="tw:size-2 tw:shrink-0 tw:rounded-full tw:bg-cali-blue-line" />Google Agenda</span>}
      </div>
      <span className="tw:text-cali-label tw:whitespace-nowrap tw:text-cali-muted"><b className="tw:mr-1 tw:text-cali-detail tw:text-cali-brand">{eventCount}</b> compromissos no período</span>
    </footer>
  );
}
