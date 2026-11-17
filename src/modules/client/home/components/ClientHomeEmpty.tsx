import type { ReactNode } from 'react';

export function ClientHomeEmpty({ as: Element = 'div', children }: { as?: 'div' | 'p'; children: ReactNode }) {
  return <Element className="tw:flex tw:items-center tw:gap-2.5 tw:py-5.5 tw:text-sm/[1.6] tw:text-cali-sand-text">
    {children}
  </Element>;
}
