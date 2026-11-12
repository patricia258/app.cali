import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const FieldLabel = forwardRef<HTMLLabelElement, ComponentPropsWithoutRef<'label'>>(function FieldLabel(
  { className, ...props },
  ref,
) {
  return <label {...props} ref={ref} className={className ? `stacked-label ${className}` : 'stacked-label'} />;
});
