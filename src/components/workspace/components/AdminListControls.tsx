import { Input } from '../../ds/Input';
import { WorkflowControls } from '../../ds/WorkflowControls';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { FilterSelect } from '../../ds/FilterSelect';

export function AdminListControls({ children, alwaysWrap = false }: { children: ReactNode; alwaysWrap?: boolean }) {
  return (
    <WorkflowControls className={`v2-list-controls tw:flex tw:items-center tw:gap-3
      ${alwaysWrap ? 'tw:flex-wrap' : 'tw:flex-nowrap tw:[@media(max-width:980px)]:flex-wrap'}`}>
      {children}
    </WorkflowControls>
  );
}

export function AdminListFilter(props: Omit<ComponentPropsWithoutRef<'select'>, 'className'>) {
  return (
    <FilterSelect {...props} className="tw:h-11 tw:flex-[0_1_15.385rem]" />
  );
}

export function AdminListSearch(props: Omit<ComponentPropsWithoutRef<'input'>, 'className'>) {
  return (
    <label className="v2-record-search tw:my-0 tw:mr-0 tw:ml-auto tw:flex tw:h-11 tw:min-w-[12.308rem]
      tw:flex-[1_1_16.923rem] tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid
      tw:border-cali-line tw:bg-cali-input tw:px-3.5 tw:text-cali-muted
      tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold-accent tw:[@media(max-width:980px)]:ml-0">
      <Search size={14} />
      <Input variant="bare" {...props} className="tw:flex-1 tw:text-sm/[inherit]
        tw:text-cali-text tw:outline-none" />
    </label>
  );
}
