import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewActivityLink({ href, title, detail, leading, trailing }: {
  href: string;
  title: string;
  detail: ReactNode;
  leading: ReactNode;
  trailing: ReactNode;
}) {
  return <Link to={href} className="tw:flex tw:w-full tw:items-center tw:gap-[1.08rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f1ebe5] tw:px-[.31rem] tw:py-[1.23rem] tw:text-left tw:text-[#554744] tw:last:border-b-0">
    {leading}
    <span className="tw:min-w-0 tw:flex-1">
      <strong className="tw:mb-[.38rem] tw:block tw:text-[.92rem]/[inherit]">{title}</strong>
      <small className="tw:block tw:text-[.77rem]/[inherit] tw:font-normal tw:text-[#a39790]">{detail}</small>
    </span>
    {trailing}
  </Link>;
}
