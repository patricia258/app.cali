import type { ReactNode } from 'react';

type AdminMetric = {
  label: string;
  value: ReactNode;
  description: string;
};

export function AdminMetricsStrip({ metrics }: { metrics: readonly AdminMetric[] }) {
  return (
    <section className="v2-kpi-strip tw:mx-0 tw:mt-0 tw:mb-[1.231rem] tw:grid tw:grid-cols-[repeat(auto-fit,minmax(11.538rem,1fr))]
      tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e8ddd6] tw:bg-white">
      {metrics.map(({ label, value, description }) => (
        <article key={label} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.615rem] tw:border-0 tw:border-t-[0.231rem]
          tw:border-r tw:border-solid tw:border-t-[#b48a53] tw:border-r-[#e9ded6] tw:px-[1.385rem] tw:py-[1.231rem] tw:last:border-r-0">
          <span className="tw:text-[0.846rem] tw:text-[#998c85]">{label}</span>
          <strong className="tw:text-[1.846rem]/none tw:font-semibold tw:text-cali-brand">{value}</strong>
          <em className="tw:text-[0.769rem] tw:text-[#96867c] tw:not-italic">{description}</em>
        </article>
      ))}
    </section>
  );
}
