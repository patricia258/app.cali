import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewDeadlineLink({ href, title, detail, date }: {
  href: string;
  title: string;
  detail: ReactNode;
  date: string;
}) {
  return <Link to={href} className="tw:flex tw:w-full tw:items-center tw:gap-[.92rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee6df] tw:px-[.15rem] tw:py-[1.08rem] tw:text-left tw:text-[#51423d]">
    <CalendarDays size={16} />
    <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-[.38rem]">
      <strong>{title}</strong>
      <small className="tw:text-[.77rem]/[inherit] tw:text-[#92847b]">{detail}</small>
    </span>
    <b className="tw:whitespace-nowrap tw:text-[#8d5a49]">{date}</b>
  </Link>;
}
