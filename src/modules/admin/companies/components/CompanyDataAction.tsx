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
      className={`tw:mt-4.5 tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-4.5 tw:rounded-cali-panel tw:border tw:border-solid tw:px-4.5 tw:py-4 tw:text-sm ${due
        ? 'tw:border-cali-red-soft tw:border-l-[.308rem] tw:border-l-cali-danger tw:bg-cali-danger-surface'
        : 'tw:border-cali-line tw:bg-cali-neutral-surface'}`}
    >
      <Icon
        aria-hidden="true"
        className={`tw:size-5 tw:shrink-0 ${due ? 'tw:text-cali-danger' : tone === 'done' ? 'tw:text-cali-green-accent' : tone === 'neutral' ? 'tw:text-cali-neutral-accent' : 'tw:text-cali-accent'}`}
      />
      <div className={`tw:flex tw:min-w-0 tw:flex-1 tw:basis-44 tw:flex-col tw:gap-1 tw:leading-[1.45] ${due ? 'tw:[&>strong]:text-cali-red-text' : ''}`}>
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
      className={`tw:shrink-0 tw:rounded-cali-compact-control tw:border tw:border-solid tw:px-5 tw:py-2.5 tw:text-cali-body tw:font-semibold tw:text-cali-neutral-surface tw:disabled:cursor-wait tw:disabled:opacity-60 ${danger
        ? 'tw:border-cali-danger tw:bg-cali-danger'
        : 'tw:border-cali-accent tw:bg-cali-accent'}`}
    >
      {children}
    </button>
  );
}

export function CompanyDataStatus({ failed, children }: { failed?: boolean; children: ReactNode }) {
  return <p role={failed ? 'alert' : 'status'} className={`tw:m-0 tw:font-semibold ${failed ? 'tw:text-cali-danger' : 'tw:text-cali-green-accent'}`}>{children}</p>;
}
