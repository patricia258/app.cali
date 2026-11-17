import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { bareControl, controlFrame, controlFocus, fieldPadding, compactFieldPadding } from './fieldControlStyles';

const styles = {
  field: `${controlFrame} ${fieldPadding} tw:min-h-24 tw:resize-y`,
  compact: `${controlFrame} ${compactFieldPadding} tw:resize-y`,
  bare: bareControl,
  embedded: controlFocus,
};

type TextareaProps = ComponentPropsWithoutRef<'textarea'> & { variant?: keyof typeof styles };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { variant = 'field', className = '', ...props },
  ref,
) {
  return <textarea {...props} ref={ref} data-ds-control="textarea" data-ds-field={variant !== "embedded" ? "" : undefined} className={`${styles[variant]} ${className}`} />;
});
