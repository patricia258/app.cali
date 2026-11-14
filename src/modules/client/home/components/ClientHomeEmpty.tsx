import type { ReactNode } from 'react';

export function ClientHomeEmpty({ as: Element = 'div', children }: { as?: 'div' | 'p'; children: ReactNode }) {
  return <Element className="tw:flex tw:items-center tw:gap-[0.615rem] tw:py-[1.385rem] tw:text-[0.846rem]/[1.6] tw:text-[#8c8076]">
    {children}
  </Element>;
}
