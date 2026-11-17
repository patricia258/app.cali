import type { ReactNode } from 'react';
import { DocumentAutoCover } from './DocumentAutoCover';

const coverBorder = {
  delivery: 'tw:border-b-cali-gold',
  report: 'tw:border-b-cali-violet-accent',
  work: 'tw:border-b-cali-teal-accent',
} as const;

export function DocumentCardArt({ cover, logo, name, label, folder, onOpen, fallback, tone = 'work', children }: {
  cover?: string | null;
  logo?: string | null;
  name: string;
  label: string;
  folder?: boolean;
  onOpen: () => void;
  fallback: ReactNode;
  tone?: keyof typeof coverBorder;
  children?: ReactNode;
}) {
  return <div className="tw:relative">
    <button
      type="button"
      className={`tw:relative tw:block tw:h-[8.615rem] tw:w-full tw:cursor-pointer tw:overflow-hidden tw:border-0 tw:border-b tw:border-solid tw:bg-cali-neutral-soft tw:p-0 ${coverBorder[tone]}`}
      aria-label={label}
      onClick={onOpen}
    >
      {cover ? <img className="tw:size-full tw:object-cover" src={cover} alt="" /> : logo
        ? <DocumentAutoCover logo={logo} name={name} />
        : <span className={`tw:absolute tw:inset-0 tw:grid tw:place-items-center tw:bg-cali-neutral-soft tw:text-cali-brand tw:[&_b]:text-cali-body/[inherit] tw:[&_b]:tracking-[0.308rem] ${folder ? 'tw:gap-2.5' : 'tw:gap-3'}`}>{fallback}</span>}
    </button>
    {children}
  </div>;
}

export function DocumentCardTags({ children }: { children: ReactNode }) {
  return <div className="tw:pointer-events-none tw:absolute tw:top-3 tw:right-3 tw:flex tw:flex-col tw:items-end tw:gap-1.5 tw:[&>span]:shadow-[0_1px_4px_rgb(var(--cali-rgb-red-inverse)/0.102)]">{children}</div>;
}


export function DocumentCardTag({ tone, children }: { tone: 'delivery' | 'report' | 'work'; children: ReactNode }) {
  const colors = {
    delivery: 'tw:bg-cali-orange-surface tw:text-cali-gold-text',
    report: 'tw:bg-cali-violet-surface tw:text-cali-violet-text',
    work: 'tw:bg-cali-teal-surface tw:text-cali-teal-text',
  };
  return <span className={`tw:m-0 tw:inline-block tw:rounded-full tw:px-3 tw:py-1.5 tw:text-cali-label ${colors[tone]}`}>{children}</span>;
}
