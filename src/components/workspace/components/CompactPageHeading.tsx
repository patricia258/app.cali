import type { ReactNode } from 'react';

export function CompactPageHeading({ eyebrow, title, description, children }: {
  eyebrow: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <header className="page-head tw:mb-[1.38rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.69rem] tw:max-[53.125rem]:items-start">
    <div className="tw:min-w-0">
      <div className="tw:mb-[.54rem] tw:text-[.77rem]/[inherit] tw:font-bold tw:tracking-[.15rem] tw:text-[#aa8f7b]">{eyebrow}</div>
      <h1 className="tw:mt-0 tw:mb-[.54rem] tw:font-cali-body tw:text-[2rem]/[normal] tw:font-semibold tw:tracking-[-.06rem]">
        {title}<span className="tw:text-cali-gold">.</span>
      </h1>
      <p className="tw:m-0 tw:text-[.92rem]/[inherit] tw:text-[#968e88]">{description}</p>
    </div>
    {children}
  </header>;
}
