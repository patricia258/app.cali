import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function AccessGateCard({ icon: Icon, title, children, wide = false }: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return <main data-access-gate className="tw:grid tw:min-h-screen tw:place-items-center tw:bg-[#f7f3ee] tw:px-5 tw:py-7 tw:font-cali-body tw:text-cali-ink">
    <section aria-labelledby="access-gate-title"
      className={`tw:box-border tw:flex tw:w-full tw:flex-col tw:gap-[1.0625rem] tw:rounded-[1.25rem] tw:border tw:border-solid tw:border-[#e8ddd4] tw:bg-white tw:px-[2.125rem] tw:py-[2.3125rem] tw:shadow-[0_1.375rem_3rem_#3d232a14] ${wide ? 'tw:max-w-[47.6875rem]' : 'tw:max-w-[33.875rem]'}`}>
      <span className="tw:grid tw:size-[3.375rem] tw:place-items-center tw:rounded-[.9375rem] tw:bg-[#f7ece6] tw:text-cali-brand" aria-hidden="true"><Icon size={22} /></span>
      <h1 id="access-gate-title" className="tw:m-0 tw:text-[1.5385rem] tw:text-cali-brand">{title}</h1>
      {children}
    </section>
  </main>;
}
