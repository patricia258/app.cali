import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const FilterSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(function FilterSelect(
  { className, ...props },
  ref,
) {
  return <select {...props} ref={ref} className={className ? `wf-record-filter ${className}` : 'wf-record-filter'} />;
});
