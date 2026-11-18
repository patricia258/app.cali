import type { ReactNode } from 'react';

export function CompanyMetrics({ values }: { values: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="tw:mt-0 tw:mb-4.5 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] tw:gap-3.5">
      {values.map(([label, value]) => (
        <div key={label} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-2 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-4">
          <dt className="tw:text-xs tw:text-cali-muted">{label}</dt>
          <dd className="tw:m-0 tw:text-lg tw:font-bold tw:text-cali-brand">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
