import type { ReactNode } from 'react';

export function CompanyMetrics({ values }: { values: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="tw:mt-0 tw:mb-[1.077rem] tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] tw:gap-[.923rem]">
      {values.map(([label, value]) => (
        <div key={label} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.462rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-white tw:px-[1.154rem] tw:py-4">
          <dt className="tw:text-[.769rem] tw:text-[#9a8c83]">{label}</dt>
          <dd className="tw:m-0 tw:text-[1.077rem] tw:font-bold tw:text-cali-brand">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
