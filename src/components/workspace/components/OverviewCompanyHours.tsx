import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewCompanyHours({ company, logo, description, percent, href }: {
  company: string;
  logo: ReactNode;
  description: string;
  percent: number | null;
  href: string;
}) {
  const fill = percent !== null && percent >= 90 ? 'tw:bg-cali-danger' : percent !== null && percent >= 75 ? 'tw:bg-cali-gold' : 'tw:bg-cali-red-strong';
  return <Link to={href} className="tw:flex tw:w-full tw:items-center tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:px-0.5 tw:py-4.5 tw:text-left tw:text-cali-neutral-strong tw:last:border-b-0">
    <span className="tw:grid tw:size-11 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-soft tw:font-extrabold tw:text-cali-brand tw:[&>img]:size-full tw:[&>img]:rounded-lg tw:[&>img]:object-contain">{logo}</span>
    <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1.5">
      <strong>{company}</strong>
      <small className="tw:text-xs/[inherit] tw:text-cali-sand-text">{description}</small>
      <span className="tw:h-2 tw:w-full tw:overflow-hidden tw:rounded-full tw:bg-cali-neutral-soft">
        <i className={`tw:block tw:h-full tw:rounded-full ${fill}`} style={{ width: `${Math.min(100, percent ?? 0)}%` }} />
      </span>
    </span>
    <b className="tw:text-cali-brand">{percent === null ? '—' : `${percent}%`}</b>
  </Link>;
}
