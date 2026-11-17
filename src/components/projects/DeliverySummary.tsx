import type { ReactNode } from 'react';

type DeliverySummaryProps = {
  items: readonly { label: string; value: ReactNode; icon: ReactNode }[];
};

export function DeliverySummary({ items }: DeliverySummaryProps) {
  return (
    <dl className="tw:mt-0 tw:mb-5.5 tw:grid tw:grid-cols-2 tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-sand-line tw:min-[53.125rem]:grid-cols-4">
      {items.map(({ icon, label, value }) => (
        <div
          key={label}
          className="tw:flex tw:min-w-0 tw:flex-col tw:gap-2.5 tw:border-0 tw:border-r tw:border-solid tw:border-cali-line tw:p-4.5 tw:last:border-r-0 tw:max-[53.125rem]:even:border-r-0"
        >
          <dt className="tw:flex tw:flex-col tw:gap-2.5 tw:text-xs tw:text-cali-sand-text">
            {icon}
            {label}
          </dt>
          <dd className="tw:m-0 tw:text-cali-body tw:font-bold tw:wrap-anywhere tw:text-cali-brand">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
