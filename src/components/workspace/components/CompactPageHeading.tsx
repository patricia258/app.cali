import type { ReactNode } from 'react';

export function CompactPageHeading({ eyebrow, title, description, children }: {
  eyebrow: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <header className="page-head tw:mb-5.5 tw:flex tw:items-center tw:justify-between tw:gap-7 tw:max-[53.125rem]:items-start">
    <div className="tw:min-w-0">
      <div className="tw:mb-2 tw:text-xs/[inherit] tw:font-bold tw:tracking-[.15rem] tw:text-cali-sand-text">{eyebrow}</div>
      <h1 className="tw:mt-0 tw:mb-2 tw:font-cali-body tw:text-cali-display/[normal] tw:font-semibold tw:tracking-[-.06rem]">
        {title}<span className="tw:text-cali-gold">.</span>
      </h1>
      <p className="tw:m-0 tw:text-cali-body/[inherit] tw:text-cali-sand-text">{description}</p>
    </div>
    {children}
  </header>;
}
