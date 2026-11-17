import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewDeadlineLink({ href, title, detail, date }: {
  href: string;
  title: string;
  detail: ReactNode;
  date: string;
}) {
  return <Link to={href} className="tw:flex tw:w-full tw:items-center tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:px-0.5 tw:py-4.5 tw:text-left tw:text-cali-neutral-text">
    <CalendarDays size={16} />
    <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1.5">
      <strong>{title}</strong>
      <small className="tw:text-xs/[inherit] tw:text-cali-sand-text">{detail}</small>
    </span>
    <b className="tw:whitespace-nowrap tw:text-cali-red-text">{date}</b>
  </Link>;
}
