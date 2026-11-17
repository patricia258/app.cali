import type { HourSource } from '../../../api/hours/workspace';

const sourcePresentation = {
  timer: { label: 'Timer', tone: 'tw:bg-cali-scheduled-surface tw:text-cali-scheduled' },
  manual: { label: 'Manual', tone: 'tw:bg-cali-warning-surface tw:text-cali-warning' },
  interaction: { label: 'Interação', tone: 'tw:bg-cali-info-surface tw:text-cali-info' },
  calendar: { label: 'Calendário', tone: 'tw:bg-cali-success-surface tw:text-cali-success' },
} satisfies Record<HourSource, { label: string; tone: string }>;

export function HourSourceBadge({ source }: { source: HourSource }) {
  const { label, tone } = sourcePresentation[source] ?? sourcePresentation.calendar;
  return <span className={`tw:inline-block tw:rounded-md tw:px-2.5 tw:py-1.5 tw:text-xs tw:leading-[inherit] tw:font-semibold ${tone}`}>{label}</span>;
}
