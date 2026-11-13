import type { ReactNode } from 'react';

export function WorkspaceOverviewIntro({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <section className="tw:mb-[1.31rem] tw:flex tw:items-end tw:justify-between tw:gap-[1.54rem] tw:rounded-[.92rem] tw:border tw:border-solid tw:border-[#e7d9d0] tw:bg-[linear-gradient(105deg,#fffaf7,#f3e8e5)] tw:px-[2.31rem] tw:py-[2.15rem] tw:max-[53.125rem]:flex-col tw:max-[53.125rem]:items-start">
    <div>
      <small className="tw:text-[.77rem]/[inherit] tw:font-extrabold tw:tracking-[.115rem] tw:text-cali-gold">{eyebrow}</small>
      <h2 className="tw:my-[.62rem] tw:text-[2.69rem]/[inherit] tw:font-bold tw:tracking-[-.1rem] tw:text-[#322f2c]">{title}</h2>
      <p className="tw:m-0 tw:max-w-[46.15rem] tw:leading-[1.5] tw:text-[#857b75]">{description}</p>
    </div>
    {children}
  </section>;
}
