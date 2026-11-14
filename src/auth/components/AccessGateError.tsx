import type { ReactNode } from 'react';

export function AccessGateError({ children }: { children: ReactNode }) {
  return <p role="alert" className="tw:m-0 tw:rounded-[.625rem] tw:border tw:border-l-[.3125rem] tw:border-solid tw:border-[#f0c4c0] tw:border-l-[#b3261e] tw:bg-[#fdecea] tw:px-3.5 tw:py-3 tw:text-[.962rem] tw:text-[#7a1c16]">{children}</p>;
}
