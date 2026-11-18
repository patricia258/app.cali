import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type GuidedFieldStyle = {
  className?: string;
  layout?: 'question' | 'identity';
};

const field = 'tw:block tw:rounded-none tw:border-0! tw:border-b-2! tw:border-solid! tw:border-b-cali-brand/25! tw:bg-transparent! tw:px-0 tw:pt-2 tw:pb-2.5 tw:font-cali-body tw:leading-[1.4] tw:font-normal tw:text-cali-brand! tw:[-webkit-text-fill-color:var(--cali-color-burgundy)] tw:shadow-none! tw:outline-none! tw:placeholder:text-cali-brand/32 tw:focus:border-b-cali-brand!';
const layouts = {
  question: 'tw:mt-7.5 tw:ml-9.5 tw:w-[calc(100%-2.375rem)] tw:[--ws-type-body:clamp(1.25rem,3vw,1.625rem)] tw:text-cali-question tw:max-[40.0625rem]:ml-0 tw:max-[40.0625rem]:w-full',
  identity: 'tw:mt-1.5 tw:w-full tw:[--ws-type-body:clamp(1.25rem,3vw,1.625rem)] tw:text-cali-question',
};

export const GuidedInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'> & GuidedFieldStyle>(function GuidedInput(
  { className = '', layout = 'question', ...props },
  ref,
) {
  return <input {...props} ref={ref} className={`${field} ${layouts[layout]} ${className}`} />;
});

export const GuidedTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'> & GuidedFieldStyle>(function GuidedTextarea(
  { className = '', layout = 'question', ...props },
  ref,
) {
  return <textarea {...props} ref={ref} className={`${field} ${layouts[layout]} tw:min-h-27.5 tw:resize-none! ${className}`} />;
});
