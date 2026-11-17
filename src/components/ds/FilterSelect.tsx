import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Select } from './Select';

export const FilterSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(function FilterSelect(
  { className = '', ...props },
  ref,
) {
  return <Select {...props} ref={ref} variant="filter" className={`wf-record-filter tw:mr-2.5 ${className}`} />;
});
