import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type GuidedFieldStyle = {
  className?: string;
  layout?: 'question' | 'identity';
};

const field = 'tw:block tw:rounded-none tw:border-0! tw:border-b-2! tw:border-solid! tw:border-b-[rgba(90,30,45,.25)]! tw:bg-transparent! tw:px-0 tw:pt-2 tw:pb-[0.625rem] tw:font-cali-body tw:leading-[1.4] tw:font-normal tw:text-cali-brand! tw:[-webkit-text-fill-color:var(--cali-color-burgundy)] tw:shadow-none! tw:outline-none! tw:placeholder:text-[rgba(90,30,45,.32)] tw:focus:border-b-cali-brand!';
const layouts = {
  question: 'tw:mt-[1.875rem] tw:ml-[2.375rem] tw:w-[calc(100%-2.375rem)] tw:[--ws-type-body:clamp(1.25rem,3vw,1.625rem)] tw:text-[clamp(1.25rem,3vw,1.625rem)] tw:max-[40.0625rem]:ml-0 tw:max-[40.0625rem]:w-full',
  identity: 'tw:mt-[0.375rem] tw:w-full tw:[--ws-type-body:clamp(1.25rem,3vw,1.625rem)] tw:text-[clamp(1.25rem,3vw,1.625rem)]',
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
  return <textarea {...props} ref={ref} className={`${field} ${layouts[layout]} tw:min-h-[6.875rem] tw:resize-none! ${className}`} />;
});
