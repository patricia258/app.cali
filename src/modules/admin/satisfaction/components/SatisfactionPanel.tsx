import type { ReactNode } from 'react';

export function SatisfactionPanel({ eyebrow, title, aside, children, className }: {
  eyebrow?: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`tw:flex tw:min-w-0 tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:px-6 tw:py-5.5 ${className ?? ''}`}>
      <header className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:text-cali-gold">
        <div className="tw:flex tw:flex-col tw:gap-1.5">
          {eyebrow && <small className="tw:text-[.69rem] tw:leading-[inherit] tw:tracking-[.092rem] tw:text-[#ad8259]">{eyebrow}</small>}
          <h2 className="tw:m-0 tw:text-[1.077rem] tw:leading-[inherit] tw:font-semibold tw:text-[#322f2c]">{title}</h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function SatisfactionEmpty({ children }: { children: ReactNode }) {
  return <p className="tw:m-0 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#96867c]">{children}</p>;
}
