import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewActivityLink({ href, title, detail, leading, trailing }: {
  href: string;
  title: string;
  detail: ReactNode;
  leading: ReactNode;
  trailing: ReactNode;
}) {
  return <Link to={href} className="tw:flex tw:w-full tw:items-center tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:px-1 tw:py-5 tw:text-left tw:text-cali-neutral-text tw:last:border-b-0">
    {leading}
    <span className="tw:min-w-0 tw:flex-1">
      <strong className="tw:mb-1.5 tw:block tw:text-cali-body/[inherit]">{title}</strong>
      <small className="tw:block tw:text-xs/[inherit] tw:font-normal tw:text-cali-muted">{detail}</small>
    </span>
    {trailing}
  </Link>;
}
