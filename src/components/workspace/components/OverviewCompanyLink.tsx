import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function OverviewCompanyLink({ href, company, logo, detail, status }: {
  href: string;
  company: string;
  logo: ReactNode;
  detail: string;
  status: ReactNode;
}) {
  return <Link to={href} className="tw:flex tw:min-w-0 tw:items-center tw:gap-[.77rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#eee2d9] tw:p-[1rem] tw:text-left tw:text-[#554744] tw:max-[40rem]:flex-wrap">
    <span className="tw:grid tw:size-[2.69rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[.54rem] tw:bg-[#f7eee8] tw:font-bold tw:text-[#653042] tw:[&>img]:size-full tw:[&>img]:object-contain">{logo}</span>
    <span className="tw:min-w-0 tw:flex-1">
      <strong className="tw:mb-[.38rem] tw:block tw:text-[.92rem]/[inherit]">{company}</strong>
      <small className="tw:block tw:truncate tw:text-[.77rem]/[inherit] tw:text-[#a39790] tw:max-[40rem]:whitespace-normal">{detail}</small>
    </span>
    {status}
    <ArrowRight size={15} />
  </Link>;
}
