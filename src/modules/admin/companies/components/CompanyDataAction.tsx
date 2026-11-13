import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type CompanyDataActionProps = {
  icon: LucideIcon;
  tone?: 'neutral' | 'due' | 'done';
  children: ReactNode;
  action?: ReactNode;
};

export function CompanyDataAction({ icon: Icon, tone, children, action }: CompanyDataActionProps) {
  const due = tone === 'due';
  return (
    <div
      role={due ? 'alert' : undefined}
      className={`tw:mt-[1.077rem] tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-[1.077rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:px-[1.154rem] tw:py-4 tw:text-[.846rem] ${due
        ? 'tw:border-[#f1c4bd] tw:border-l-[.308rem] tw:border-l-[#b42318] tw:bg-[#fff6f4]'
        : 'tw:border-[#eadfd6] tw:bg-white'}`}
    >
      <Icon
        aria-hidden="true"
        className={`tw:size-[1.308rem] tw:shrink-0 ${due ? 'tw:text-[#b42318]' : tone === 'done' ? 'tw:text-[#1f7a4d]' : tone === 'neutral' ? 'tw:text-[#8a7a80]' : 'tw:text-[#7a1f3d]'}`}
      />
      <div className={`tw:flex tw:min-w-0 tw:flex-1 tw:basis-44 tw:flex-col tw:gap-[.308rem] tw:leading-[1.45] ${due ? 'tw:[&>strong]:text-[#8f1d14]' : ''}`}>
        {children}
      </div>
      {action}
    </div>
  );
}

export function CompanyDataButton({ onClick, children, busy, danger }: { onClick: () => void; children: ReactNode; busy?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`tw:shrink-0 tw:rounded-[.615rem] tw:border tw:border-solid tw:px-[1.231rem] tw:py-[.615rem] tw:text-[.923rem] tw:font-semibold tw:text-white tw:disabled:cursor-wait tw:disabled:opacity-60 ${danger
        ? 'tw:border-[#b42318] tw:bg-[#b42318]'
        : 'tw:border-[#7a1f3d] tw:bg-[#7a1f3d]'}`}
    >
      {children}
    </button>
  );
}

export function CompanyDataStatus({ failed, children }: { failed?: boolean; children: ReactNode }) {
  return <p role={failed ? 'alert' : 'status'} className={`tw:m-0 tw:font-semibold ${failed ? 'tw:text-[#b42318]' : 'tw:text-[#1f7a4d]'}`}>{children}</p>;
}
