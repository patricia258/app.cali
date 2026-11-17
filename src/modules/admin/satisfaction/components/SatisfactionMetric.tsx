import type { ReactNode } from 'react';

export function SatisfactionMetric({ icon, title, value, suffix, detail, tone = 'normal' }: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  suffix?: string;
  detail: string;
  tone?: 'normal' | 'attention' | 'weak';
}) {
  return (
    <article className={`tw:relative tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:bg-cali-neutral-surface tw:p-5 tw:before:absolute tw:before:inset-x-0 tw:before:top-0 tw:before:h-1 ${tone === 'attention' ? 'tw:before:bg-cali-danger' : tone === 'weak' ? 'tw:before:bg-cali-orange-line' : 'tw:before:bg-cali-gold'}`}>
      <span aria-hidden="true" className="tw:absolute tw:top-4 tw:right-4 tw:grid tw:size-8 tw:place-items-center tw:rounded-lg tw:bg-cali-surface-muted tw:text-cali-warning">{icon}</span>
      <span className="tw:pr-9 tw:text-sm tw:leading-[inherit] tw:text-cali-sand-text">{title}</span>
      <strong className={`tw:text-cali-display tw:leading-none tw:font-semibold ${tone === 'attention' ? 'tw:text-cali-danger' : 'tw:text-cali-brand'}`}>
        {value}{suffix && <small className="tw:ml-0.5 tw:text-cali-body tw:font-medium tw:text-cali-sand-text">{suffix}</small>}
      </strong>
      <span className={`tw:text-xs tw:leading-[inherit] ${tone === 'weak' ? 'tw:text-cali-warning' : 'tw:text-cali-muted'}`}>{detail}</span>
    </article>
  );
}
