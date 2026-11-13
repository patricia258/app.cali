import type { ReactNode } from 'react';

export function AccessGateLoading({ children }: { children: ReactNode }) {
  return <main className="tw:grid tw:min-h-screen tw:place-items-center tw:bg-[#f7f3ee] tw:px-5 tw:py-7 tw:font-cali-body tw:text-cali-ink">
    <p data-access-gate-loading aria-busy="true" className="tw:text-base tw:text-[#7d726b]">{children}</p>
  </main>;
}
