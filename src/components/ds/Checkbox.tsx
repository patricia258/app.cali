import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { controlFocus } from './fieldControlStyles';

type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className = '', ...props },
  ref,
) {
  return (
    <input {...props} ref={ref} type="checkbox" data-ds-control="checkbox"
      className={`tw:shrink-0 tw:accent-cali-accent tw:disabled:cursor-not-allowed ${controlFocus} ${className}`} />
  );
});
