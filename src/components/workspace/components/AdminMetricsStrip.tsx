import type { ReactNode } from 'react';

type AdminMetric = {
  label: string;
  value: ReactNode;
  description: string;
};

export function AdminMetricsStrip({ metrics }: { metrics: readonly AdminMetric[] }) {
  return (
    <section className="v2-kpi-strip tw:mx-0 tw:mt-0 tw:mb-5 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(11.538rem,1fr))]
      tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface">
      {metrics.map(({ label, value, description }) => (
        <article key={label} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-2.5 tw:border-0 tw:border-t-[0.231rem]
          tw:border-r tw:border-solid tw:border-t-cali-gold tw:border-r-cali-line tw:px-5.5 tw:py-5 tw:last:border-r-0">
          <span className="tw:text-sm tw:text-cali-sand-text">{label}</span>
          <strong className="tw:text-3xl/none tw:font-semibold tw:text-cali-brand">{value}</strong>
          <em className="tw:text-xs tw:text-cali-muted tw:not-italic">{description}</em>
        </article>
      ))}
    </section>
  );
}
