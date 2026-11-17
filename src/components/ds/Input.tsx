import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { bareControl, controlFrame, controlFocus, fieldPadding, compactFieldPadding } from './fieldControlStyles';

const styles = {
  field: `${controlFrame} ${fieldPadding} tw:min-h-13`,
  compact: `${controlFrame} ${compactFieldPadding} tw:min-h-11`,
  bare: bareControl,
  embedded: controlFocus,
};

type InputProps = ComponentPropsWithoutRef<'input'> & { variant?: keyof typeof styles };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'field', className = '', ...props },
  ref,
) {
  return <input {...props} ref={ref} data-ds-control="input" data-ds-field={variant !== "embedded" ? "" : undefined} className={`${styles[variant]} ${className}`} />;
});
