import type { ReactNode } from 'react';

type DeliverySummaryProps = {
  items: readonly { label: string; value: ReactNode; icon: ReactNode }[];
};

export function DeliverySummary({ items }: DeliverySummaryProps) {
  return (
    <dl className="tw:mt-0 tw:mb-[1.385rem] tw:grid tw:grid-cols-2 tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#eee3da] tw:min-[53.125rem]:grid-cols-4">
      {items.map(({ icon, label, value }) => (
        <div
          key={label}
          className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.615rem] tw:border-0 tw:border-r tw:border-solid tw:border-[#efe7df] tw:p-[1.154rem] tw:last:border-r-0 tw:max-[53.125rem]:even:border-r-0"
        >
          <dt className="tw:flex tw:flex-col tw:gap-[.615rem] tw:text-[.769rem] tw:text-[#99867b]">
            {icon}
            {label}
          </dt>
          <dd className="tw:m-0 tw:text-[.923rem] tw:font-bold tw:wrap-anywhere tw:text-cali-brand">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
