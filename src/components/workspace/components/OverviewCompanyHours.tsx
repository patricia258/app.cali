import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewCompanyHours({ company, logo, description, percent, href }: {
  company: string;
  logo: ReactNode;
  description: string;
  percent: number | null;
  href: string;
}) {
  const fill = percent !== null && percent >= 90 ? 'tw:bg-[#b7495d]' : percent !== null && percent >= 75 ? 'tw:bg-[#b58c52]' : 'tw:bg-[#854456]';
  return <Link to={href} className="tw:flex tw:w-full tw:items-center tw:gap-[1rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#efe8e1] tw:px-[.15rem] tw:py-[1.08rem] tw:text-left tw:text-[#39302e] tw:last:border-b-0">
    <span className="tw:grid tw:size-[2.77rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[.62rem] tw:border tw:border-solid tw:border-[#e9dad0] tw:bg-[#f5ebe5] tw:font-extrabold tw:text-cali-brand tw:[&>img]:size-full tw:[&>img]:rounded-[.54rem] tw:[&>img]:object-contain">{logo}</span>
    <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-[.38rem]">
      <strong>{company}</strong>
      <small className="tw:text-[.77rem]/[inherit] tw:text-[#968982]">{description}</small>
      <span className="tw:h-[.54rem] tw:w-full tw:overflow-hidden tw:rounded-full tw:bg-[#f1eae5]">
        <i className={`tw:block tw:h-full tw:rounded-full ${fill}`} style={{ width: `${Math.min(100, percent ?? 0)}%` }} />
      </span>
    </span>
    <b className="tw:text-cali-brand">{percent === null ? '—' : `${percent}%`}</b>
  </Link>;
}
