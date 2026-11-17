import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const FilterSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(function FilterSelect(
  { className, ...props },
  ref,
) {
  return <select {...props} ref={ref} className={`wf-record-filter tw:mr-2.5 tw:appearance-none tw:rounded-lg
    tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:bg-no-repeat
    tw:bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='2.5%204.5%2011%208'%3E%3Cpath%20d='m3%206%205%205%205-5'%20fill='none'%20stroke='currentColor'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E")]
    tw:[--filter-select-inset:0.846rem] tw:[background-position:right_var(--filter-select-inset)_center] tw:bg-size-[0.846rem]
    tw:pr-[calc(var(--filter-select-inset)+1.308rem)] tw:pl-(--filter-select-inset) tw:py-2
    tw:text-sm/[inherit] tw:text-cali-muted tw:forced-colors:appearance-auto tw:forced-colors:bg-none ${className ?? ''}`} />;
});
