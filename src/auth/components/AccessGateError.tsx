import type { ReactNode } from 'react';

export function AccessGateError({ children }: { children: ReactNode }) {
  return <p role="alert" className="tw:m-0 tw:rounded-cali-panel tw:border tw:border-l-[.3125rem] tw:border-solid tw:border-cali-red-soft tw:border-l-cali-danger tw:bg-cali-red-surface tw:px-3.5 tw:py-3 tw:text-cali-body tw:text-cali-red-text">{children}</p>;
}
