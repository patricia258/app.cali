import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const FilterSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(function FilterSelect(
  { className, ...props },
  ref,
) {
  return <select {...props} ref={ref} className={`wf-record-filter tw:mr-[0.615rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-[0.692rem] tw:py-[0.538rem] tw:text-[0.846rem]/[inherit] tw:text-[#655b57] ${className ?? ''}`} />;
});
