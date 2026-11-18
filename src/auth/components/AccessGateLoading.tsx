import type { ReactNode } from 'react';

export function AccessGateLoading({ children }: { children: ReactNode }) {
  return <main className="tw:grid tw:min-h-screen tw:place-items-center tw:bg-cali-day-canvas tw:px-5 tw:py-7 tw:font-cali-body tw:text-cali-ink">
    <p data-access-gate-loading aria-busy="true" className="tw:text-base tw:text-cali-muted">{children}</p>
  </main>;
}
