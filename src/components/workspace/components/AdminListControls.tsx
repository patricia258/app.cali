import { WorkflowControls } from '../../ds/WorkflowControls';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { FilterSelect } from '../../ds/FilterSelect';

export function AdminListControls({ children, alwaysWrap = false }: { children: ReactNode; alwaysWrap?: boolean }) {
  return (
    <WorkflowControls className={`v2-list-controls tw:flex tw:items-center tw:gap-[0.769rem]
      ${alwaysWrap ? 'tw:flex-wrap' : 'tw:flex-nowrap tw:[@media(max-width:980px)]:flex-wrap'}`}>
      {children}
    </WorkflowControls>
  );
}

export function AdminListFilter(props: Omit<ComponentPropsWithoutRef<'select'>, 'className'>) {
  return (
    <FilterSelect {...props} className="tw:h-[2.769rem] tw:min-w-0 tw:flex-[0_1_15.385rem] tw:rounded-[0.538rem]!
      tw:border tw:border-solid tw:border-[#e5d9d0]! tw:bg-white! tw:py-0! tw:pr-[2.154rem]! tw:pl-[0.846rem]!
      tw:text-[0.846rem]/[inherit] tw:text-[#322f2c]!" />
  );
}

export function AdminListSearch(props: Omit<ComponentPropsWithoutRef<'input'>, 'className'>) {
  return (
    <label className="v2-record-search tw:my-0 tw:mr-0 tw:ml-auto tw:flex tw:h-[2.769rem] tw:min-w-[12.308rem]
      tw:flex-[1_1_16.923rem] tw:items-center tw:gap-[0.538rem] tw:rounded-[0.538rem] tw:border tw:border-solid
      tw:border-[#e5d9d0] tw:bg-white tw:px-[0.846rem] tw:text-[#9a8c83] tw:[@media(max-width:980px)]:ml-0">
      <Search size={14} />
      <input {...props} className="tw:min-w-0 tw:flex-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-[0.846rem]/[inherit]
        tw:text-[#322f2c] tw:outline-none" />
    </label>
  );
}
