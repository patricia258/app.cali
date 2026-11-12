import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const GuidedInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(function GuidedInput(
  { className, ...props },
  ref,
) {
  return <input {...props} ref={ref} className={className ? `cf-text ${className}` : 'cf-text'} />;
});

export const GuidedTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'>>(function GuidedTextarea(
  { className, ...props },
  ref,
) {
  return <textarea {...props} ref={ref} className={className ? `cf-text cf-long ${className}` : 'cf-text cf-long'} />;
});
