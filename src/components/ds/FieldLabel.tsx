import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const FieldLabel = forwardRef<HTMLLabelElement, ComponentPropsWithoutRef<'label'>>(function FieldLabel(
  { className, ...props },
  ref,
) {
  return <label {...props} ref={ref} className={`stacked-label tw:flex tw:flex-col tw:gap-2 tw:text-sm/[inherit] tw:font-semibold ${className ?? ''}`} />;
});
