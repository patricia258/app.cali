import type { ReactNode } from 'react';

export function WorkspaceOverviewIntro({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <section className="tw:mb-5 tw:flex tw:items-end tw:justify-between tw:gap-6 tw:rounded-[.92rem] tw:border tw:border-solid tw:border-cali-sand-line tw:bg-[linear-gradient(105deg,var(--cali-color-sand-surface),var(--cali-color-neutral-soft))] tw:px-9 tw:py-8.5 tw:max-[53.125rem]:flex-col tw:max-[53.125rem]:items-start">
    <div>
      <small className="tw:text-xs/[inherit] tw:font-extrabold tw:tracking-[.115rem] tw:text-cali-gold">{eyebrow}</small>
      <h2 className="tw:my-2.5 tw:text-cali-display-lg/[inherit] tw:font-bold tw:tracking-[-.1rem] tw:text-cali-text">{title}</h2>
      <p className="tw:m-0 tw:max-w-[46.15rem] tw:leading-[1.5] tw:text-cali-neutral-accent">{description}</p>
    </div>
    {children}
  </section>;
}
