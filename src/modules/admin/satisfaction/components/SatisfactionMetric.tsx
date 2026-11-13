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
    <article className={`tw:relative tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:bg-white tw:p-5 tw:before:absolute tw:before:inset-x-0 tw:before:top-0 tw:before:h-1 ${tone === 'attention' ? 'tw:before:bg-[#b7495d]' : tone === 'weak' ? 'tw:before:bg-[#d2a851]' : 'tw:before:bg-[#b48a53]'}`}>
      <span aria-hidden="true" className="tw:absolute tw:top-4 tw:right-4 tw:grid tw:size-8 tw:place-items-center tw:rounded-lg tw:bg-[#f6f0eb] tw:text-[#8a5a2b]">{icon}</span>
      <span className="tw:pr-9 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#998c85]">{title}</span>
      <strong className={`tw:text-[2rem] tw:leading-none tw:font-semibold ${tone === 'attention' ? 'tw:text-[#b7495d]' : 'tw:text-cali-brand'}`}>
        {value}{suffix && <small className="tw:ml-0.5 tw:text-[.923rem] tw:font-medium tw:text-[#a8938f]">{suffix}</small>}
      </strong>
      <span className={`tw:text-[.77rem] tw:leading-[inherit] ${tone === 'weak' ? 'tw:text-[#97672f]' : 'tw:text-[#96867c]'}`}>{detail}</span>
    </article>
  );
}
