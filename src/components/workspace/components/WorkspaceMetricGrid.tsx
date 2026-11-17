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
  green: 'tw:border-t-cali-teal-accent',
  blue: 'tw:border-t-cali-blue-line',
  purple: 'tw:border-t-cali-violet-accent',
  amber: 'tw:border-t-cali-orange-line',
};

export function WorkspaceMetricGrid({ label, metrics, columns = 4 }: {
  label?: string;
  metrics: WorkspaceMetric[];
  columns?: 3 | 4;
}) {
  return <div aria-label={label} className={`tw:mb-5 tw:grid tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:max-[40rem]:grid-cols-2 ${columns === 3 ? 'tw:grid-cols-3' : 'tw:grid-cols-4'}`}>
    {metrics.map(({ label: name, value, helper, tone, href }) => {
      const className = `tw:flex tw:min-h-[9.54rem] tw:min-w-0 tw:flex-col tw:items-start tw:gap-3.5 tw:border-0 tw:border-t-[.23rem] tw:border-r tw:border-solid tw:border-r-cali-line tw:bg-cali-neutral-surface tw:px-6.5 tw:py-6 tw:text-left tw:text-cali-brand tw:last:border-r-0 ${borderColors[tone] ?? 'tw:border-t-cali-gold'}`;
      const content = <>
        <small className="tw:text-sm/[inherit] tw:text-cali-sand-text">{name}</small>
        <strong className="tw:text-3xl/[inherit] tw:font-semibold">{value}</strong>
        <span className="tw:text-xs/[inherit] tw:text-cali-muted">{helper}</span>
      </>;
      return href
        ? <Link className={className} key={name} to={href}>{content}</Link>
        : <div className={className} key={name}>{content}</div>;
    })}
  </div>;
}
