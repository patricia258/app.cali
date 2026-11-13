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
  return <div className="v2-doc-art-wrap tw:relative">
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
  return <div className="v2-doc-tags tw:pointer-events-none tw:absolute tw:top-[0.769rem] tw:right-[0.769rem] tw:flex tw:flex-col tw:items-end tw:gap-[0.385rem] tw:[&>span]:shadow-[0_1px_4px_#2817241a] tw:[&>.wf-doc-label]:m-0! tw:[&>.wf-doc-label]:bg-white!">{children}</div>;
}
