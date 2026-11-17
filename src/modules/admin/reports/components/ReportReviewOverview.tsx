import type { ReactNode } from 'react';

type Metric = {
  label: string;
  value: number;
  attention?: boolean;
};

function ReportReviewMetric({ label, value, attention = false }: Metric) {
  return (
    <article className={`tw:min-w-[8.62rem] tw:rounded-2xl tw:border tw:border-solid tw:px-4.5 tw:py-3.5
      tw:max-[680px]:min-w-0 ${attention ? 'attention tw:border-cali-brand tw:bg-cali-brand' : 'tw:border-cali-brand/10 tw:bg-cali-sand-surface/62'}`}>
      <strong className={`tw:block tw:text-cali-title-lg tw:leading-none tw:font-semibold ${attention ? 'tw:text-cali-neutral-surface' : 'tw:text-cali-brand'}`}>{value}</strong>
      <span className={`tw:mt-0.5 tw:block tw:text-cali-label ${attention ? 'tw:text-cali-neutral-surface' : 'tw:text-cali-sand-strong'}`}>{label}</span>
    </article>
  );
}

export function ReportReviewOverview({ label, title, description, metrics }: {
  label: string;
  title: ReactNode;
  description: ReactNode;
  metrics: Metric[];
}) {
  return (
    <section
      className="reports-v16-review-map tw:relative tw:mb-4.5 tw:flex tw:items-center tw:justify-between
        tw:gap-8.5 tw:overflow-hidden tw:rounded-[1.38rem] tw:border tw:border-solid tw:border-cali-orange-line
        tw:bg-[linear-gradient(135deg,var(--cali-color-gold-soft)_0%,var(--cali-color-orange-soft)_50%,var(--cali-color-gold-soft)_100%)] tw:px-8 tw:py-7
        tw:text-cali-sand-inverse tw:shadow-[0_0.875rem_2.125rem_rgb(var(--cali-rgb-gold-strong)/0.102)] tw:before:pointer-events-none tw:before:absolute
        tw:before:-bottom-[11.92rem] tw:before:-left-[8.08rem] tw:before:size-[17.69rem] tw:before:rounded-full
        tw:before:border-[2.62rem] tw:before:border-solid tw:before:border-cali-brand/7 tw:before:content-['']
        tw:max-[1050px]:flex-col tw:max-[1050px]:items-start"
    >
      <div className="tw:relative tw:z-1 tw:max-w-[53.85rem]">
        <span className="tw:text-cali-label tw:font-black tw:tracking-[0.14em] tw:text-cali-brand">{label}</span>
        <h2 className="tw:mt-2 tw:mb-1.5 tw:text-xl tw:leading-[1.3] tw:tracking-normal tw:text-cali-sand-inverse">{title}</h2>
        <p className="tw:m-0 tw:text-sm tw:leading-normal tw:text-cali-sand-strong">{description}</p>
      </div>
      <div className="reports-v16-review-stats tw:relative tw:z-1 tw:grid tw:grid-cols-[repeat(3,minmax(8.46rem,1fr))] tw:gap-2.5 tw:max-[680px]:w-full tw:max-[680px]:grid-cols-3">
        {metrics.map((metric) => <ReportReviewMetric key={metric.label} {...metric} />)}
      </div>
    </section>
  );
}
