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
  return <Link to={href} className="tw:flex tw:min-w-0 tw:items-center tw:gap-3 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:p-4 tw:text-left tw:text-cali-neutral-text tw:max-[40rem]:flex-wrap">
    <span className="tw:grid tw:size-11 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-lg tw:bg-cali-neutral-soft tw:font-bold tw:text-cali-red-strong tw:[&>img]:size-full tw:[&>img]:object-contain">{logo}</span>
    <span className="tw:min-w-0 tw:flex-1">
      <strong className="tw:mb-1.5 tw:block tw:text-cali-body/[inherit]">{company}</strong>
      <small className="tw:block tw:truncate tw:text-xs/[inherit] tw:text-cali-muted tw:max-[40rem]:whitespace-normal">{detail}</small>
    </span>
    {status}
    <ArrowRight size={15} />
  </Link>;
}
