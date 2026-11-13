import type { HourSource } from '../../../api/hours/workspace';

const sourcePresentation = {
  timer: { label: 'Timer', tone: 'tw:bg-[#f1eaff] tw:text-[#8055a5]' },
  manual: { label: 'Manual', tone: 'tw:bg-[#fff2dc] tw:text-[#97672f]' },
  interaction: { label: 'Interação', tone: 'tw:bg-[#e8f2fa] tw:text-[#3e83aa]' },
  calendar: { label: 'Calendário', tone: 'tw:bg-[#e6f6ec] tw:text-[#31805a]' },
} satisfies Record<HourSource, { label: string; tone: string }>;

export function HourSourceBadge({ source }: { source: HourSource }) {
  const { label, tone } = sourcePresentation[source] ?? sourcePresentation.calendar;
  return <span className={`tw:inline-block tw:rounded-md tw:px-2.5 tw:py-1.5 tw:text-[.77rem] tw:leading-[inherit] tw:font-semibold ${tone}`}>{label}</span>;
}
