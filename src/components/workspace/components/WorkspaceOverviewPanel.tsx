import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '../../navigation/Link';

export function WorkspaceOverviewPanel({ title, action, children }: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return <section className="tw:min-w-0 tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:p-[1.77rem]">
    <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-[1.15rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4db] tw:pb-[1.08rem]">
      <h2 className="tw:m-0 tw:text-[1.15rem]/[inherit]">{title}</h2>
      {action && <Link className="tw:inline-flex tw:items-center tw:gap-[.38rem] tw:text-[.85rem]/[inherit] tw:text-cali-brand" to={action.href}>{action.label} <ArrowRight size={14} /></Link>}
    </header>
    {children}
  </section>;
}
