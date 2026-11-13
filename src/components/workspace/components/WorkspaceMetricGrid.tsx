import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

type WorkspaceMetric = {
  label: string;
  value: ReactNode;
  helper: ReactNode;
  tone: string;
  href?: string;
};

const borderColors: Record<string, string> = {
  green: 'tw:border-t-[#3caf80]',
  blue: 'tw:border-t-[#7aafcd]',
  purple: 'tw:border-t-[#a484d7]',
  amber: 'tw:border-t-[#dfa848]',
};

export function WorkspaceMetricGrid({ label, metrics, columns = 4 }: {
  label?: string;
  metrics: WorkspaceMetric[];
  columns?: 3 | 4;
}) {
  return <div aria-label={label} className={`tw:mb-[1.31rem] tw:grid tw:overflow-hidden tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#e8ddd6] tw:bg-white tw:max-[40rem]:grid-cols-2 ${columns === 3 ? 'tw:grid-cols-3' : 'tw:grid-cols-4'}`}>
    {metrics.map(({ label: name, value, helper, tone, href }) => {
      const className = `tw:flex tw:min-h-[9.54rem] tw:min-w-0 tw:flex-col tw:items-start tw:gap-[.92rem] tw:border-0 tw:border-t-[.23rem] tw:border-r tw:border-solid tw:border-r-[#e9ded6] tw:bg-white tw:px-[1.62rem] tw:py-[1.46rem] tw:text-left tw:text-cali-brand tw:last:border-r-0 ${borderColors[tone] ?? 'tw:border-t-[#b48a53]'}`;
      const content = <>
        <small className="tw:text-[.85rem]/[inherit] tw:text-[#998c85]">{name}</small>
        <strong className="tw:text-[1.85rem]/[inherit] tw:font-semibold">{value}</strong>
        <span className="tw:text-[.77rem]/[inherit] tw:text-[#96867c]">{helper}</span>
      </>;
      return href
        ? <Link className={className} key={name} to={href}>{content}</Link>
        : <div className={className} key={name}>{content}</div>;
    })}
  </div>;
}
