import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function WorkspaceOverviewPanel({ title, action, children }: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return <section className="tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-7">
    <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:pb-4.5">
      <h2 className="tw:m-0 tw:text-lg/[inherit]">{title}</h2>
      {action && <Link className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-sm/[inherit] tw:text-cali-brand" to={action.href}>{action.label} <ArrowRight size={14} /></Link>}
    </header>
    {children}
  </section>;
}
