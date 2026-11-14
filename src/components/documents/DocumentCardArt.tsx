import type { ReactNode } from 'react';
import { DocumentAutoCover } from './DocumentAutoCover';

const coverBorder = {
  delivery: 'tw:border-b-[#b58c52]',
  report: 'tw:border-b-[#946db4]',
  work: 'tw:border-b-[#5eac9a]',
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
      className={`tw:relative tw:block tw:h-[8.615rem] tw:w-full tw:cursor-pointer tw:overflow-hidden tw:border-0 tw:border-b tw:border-solid tw:bg-[#f6f1ee] tw:p-0 ${coverBorder[tone]}`}
      aria-label={label}
      onClick={onOpen}
    >
      {cover ? <img className="tw:size-full tw:object-cover" src={cover} alt="" /> : logo
        ? <DocumentAutoCover logo={logo} name={name} />
        : <span className={`tw:absolute tw:inset-0 tw:grid tw:place-items-center tw:bg-[#efe9e8] tw:text-cali-brand tw:[&_b]:text-[0.923rem]/[inherit] tw:[&_b]:tracking-[0.308rem] ${folder ? 'tw:gap-[0.615rem]' : 'tw:gap-[0.769rem]'}`}>{fallback}</span>}
    </button>
    {children}
  </div>;
}

export function DocumentCardTags({ children }: { children: ReactNode }) {
  return <div className="tw:pointer-events-none tw:absolute tw:top-[0.769rem] tw:right-[0.769rem] tw:flex tw:flex-col tw:items-end tw:gap-[0.385rem] tw:[&>span]:shadow-[0_1px_4px_#2817241a]">{children}</div>;
}


export function DocumentCardTag({ tone, children }: { tone: 'delivery' | 'report' | 'work'; children: ReactNode }) {
  const colors = {
    delivery: 'tw:bg-[#fff1d8] tw:text-[#966423]',
    report: 'tw:bg-[#f2eaf8] tw:text-[#7753a1]',
    work: 'tw:bg-[#e3f5ef] tw:text-[#217a66]',
  };
  return <span className={`tw:m-0 tw:inline-block tw:rounded-full tw:px-[.692rem] tw:py-[.385rem] tw:text-[.692rem] ${colors[tone]}`}>{children}</span>;
}
