import type { ReactNode } from 'react';

export function ReportSectionHeading({ number, title, description, alert = false }: {
  number: string;
  title: ReactNode;
  description: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="reports-v16-section-heading tw:mb-6 tw:grid tw:grid-cols-[2.625rem_minmax(0,1fr)] tw:items-start tw:gap-4.5">
      <span className="tw:pt-1 tw:text-sm tw:font-bold tw:tracking-[0.06em] tw:text-cali-gold">{number}</span>
      <div>
        <h2 className="tw:m-0 tw:text-lg tw:leading-[1.3] tw:tracking-normal tw:text-cali-neutral-strong tw:workspace-night:text-cali-text">{title}</h2>
        <p className={`tw:mt-1.5 tw:mb-0 tw:text-cali-body tw:leading-[calc(1/0.75)] tw:leading-normal ${alert ? 'tw:font-semibold tw:text-cali-warning' : 'tw:text-cali-neutral-accent tw:workspace-night:text-cali-sand-accent'}`}>{description}</p>
      </div>
    </div>
  );
}
