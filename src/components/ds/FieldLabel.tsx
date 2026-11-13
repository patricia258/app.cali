import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const FieldLabel = forwardRef<HTMLLabelElement, ComponentPropsWithoutRef<'label'>>(function FieldLabel(
  { className, ...props },
  ref,
) {
  return <label {...props} ref={ref} className={`stacked-label tw:flex tw:flex-col tw:gap-[0.538rem] tw:text-[0.846rem]/[inherit] tw:font-semibold ${className ?? ''}`} />;
});
