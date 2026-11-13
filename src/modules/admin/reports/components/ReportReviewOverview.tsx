import type { ReactNode } from 'react';

type Metric = {
  label: string;
  value: number;
  attention?: boolean;
};

function ReportReviewMetric({ label, value, attention = false }: Metric) {
  return (
    <article className={`tw:min-w-[8.62rem] tw:rounded-[1rem] tw:border tw:border-solid tw:px-[1.08rem] tw:py-[0.92rem]
      tw:max-[680px]:min-w-0 ${attention ? 'attention tw:border-cali-brand tw:bg-cali-brand' : 'tw:border-[#5a1e2d1a] tw:bg-[#fffdf99e]'}`}>
      <strong className={`tw:block tw:text-[1.69rem] tw:leading-none tw:font-semibold ${attention ? 'tw:text-white' : 'tw:text-cali-brand'}`}>{value}</strong>
      <span className={`tw:mt-[0.15rem] tw:block tw:text-[0.69rem] ${attention ? 'tw:text-white' : 'tw:text-[#6b5a4b]'}`}>{label}</span>
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
      className="reports-v16-review-map tw:relative tw:mb-[1.08rem] tw:flex tw:items-center tw:justify-between
        tw:gap-[2.15rem] tw:overflow-hidden tw:rounded-[1.38rem] tw:border tw:border-solid tw:border-[#d6b86d]
        tw:bg-[linear-gradient(135deg,#f5e7b5_0%,#edcf80_50%,#f7edc9_100%)] tw:px-8 tw:py-[1.69rem]
        tw:text-[#34291f] tw:shadow-[0_0.875rem_2.125rem_#694d201a] tw:before:pointer-events-none tw:before:absolute
        tw:before:-bottom-[11.92rem] tw:before:-left-[8.08rem] tw:before:size-[17.69rem] tw:before:rounded-full
        tw:before:border-[2.62rem] tw:before:border-solid tw:before:border-[#5a1e2d12] tw:before:content-['']
        tw:max-[1050px]:flex-col tw:max-[1050px]:items-start"
    >
      <div className="tw:relative tw:z-1 tw:max-w-[53.85rem]">
        <span className="tw:text-[0.69rem] tw:font-black tw:tracking-[0.14em] tw:text-cali-brand">{label}</span>
        <h2 className="tw:mt-[0.46rem] tw:mb-[0.38rem] tw:text-[1.31rem] tw:leading-[1.3] tw:tracking-normal tw:text-[#30251e]">{title}</h2>
        <p className="tw:m-0 tw:text-[0.85rem] tw:leading-normal tw:text-[#665443]">{description}</p>
      </div>
      <div className="reports-v16-review-stats tw:relative tw:z-1 tw:grid tw:grid-cols-[repeat(3,minmax(8.46rem,1fr))] tw:gap-[0.62rem] tw:max-[680px]:w-full tw:max-[680px]:grid-cols-3">
        {metrics.map((metric) => <ReportReviewMetric key={metric.label} {...metric} />)}
      </div>
    </section>
  );
}
