import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function AccessGateCard({ icon: Icon, title, children, wide = false }: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return <main data-access-gate className="tw:grid tw:min-h-screen tw:place-items-center tw:bg-cali-day-canvas tw:px-5 tw:py-7 tw:font-cali-body tw:text-cali-ink">
    <section aria-labelledby="access-gate-title"
      className={`tw:box-border tw:flex tw:w-full tw:flex-col tw:gap-4 tw:rounded-[1.25rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-8.5 tw:py-9 tw:shadow-[0_1.375rem_3rem_rgb(var(--cali-rgb-red-inverse)/0.07843)] ${wide ? 'tw:max-w-[47.6875rem]' : 'tw:max-w-135.5'}`}>
      <span className="tw:grid tw:size-13.5 tw:place-items-center tw:rounded-2xl tw:bg-cali-neutral-soft tw:text-cali-brand" aria-hidden="true"><Icon size={22} /></span>
      <h1 id="access-gate-title" className="tw:m-0 tw:text-2xl tw:text-cali-brand">{title}</h1>
      {children}
    </section>
  </main>;
}
