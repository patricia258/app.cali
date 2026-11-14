import type { ComponentPropsWithoutRef } from 'react';

type Props = ComponentPropsWithoutRef<'div'>;

export function WorkflowControls({ className = '', ...props }: Props) {
  return <div {...props} className={`wf-controls tw:mb-[1.077rem] tw:flex tw:min-h-[4.615rem] tw:items-center tw:gap-[0.615rem]
    tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#ebe4de] tw:bg-white tw:px-4 tw:py-[0.846rem]
    tw:[&_strong]:text-[0.846rem]/[inherit] tw:[&_strong]:text-[#574945]
    tw:[@media(max-width:47.5rem)]:flex-wrap tw:[@media(max-width:47.5rem)]:gap-y-[0.769rem] ${className}`} />;
}

export function WorkflowControlsAside({ className = '', ...props }: Props) {
  return <div {...props} className={`wf-control-right tw:ml-auto tw:flex tw:items-center tw:gap-[0.692rem]
    tw:rounded-[0.538rem] tw:bg-[#faf8f5] tw:px-[0.846rem] tw:py-[0.538rem] tw:text-[#8b7f77]
    tw:[&_:is(input,select)]:max-w-[15.385rem] tw:[&_:is(input,select)]:border-0 tw:[&_:is(input,select)]:bg-transparent
    tw:[&_:is(input,select)]:text-[0.846rem]/[inherit] tw:[&_:is(input,select)]:text-[#594e4a] tw:[&_:is(input,select)]:outline-none
    tw:[@media(max-width:47.5rem)]:ml-0 tw:[@media(max-width:47.5rem)]:w-full
    tw:[@media(max-width:47.5rem)]:flex-wrap tw:[@media(max-width:47.5rem)]:gap-y-[0.615rem] ${className}`} />;
}

export function WorkflowSegments({ className = '', ...props }: Props) {
  return <div {...props} className={`wf-segments tw:flex tw:items-center tw:gap-[0.231rem] tw:rounded-[0.538rem]
    tw:bg-[#f5f1ed] tw:p-[0.308rem] tw:[@media(max-width:47.5rem)]:flex-wrap
    tw:[&_button]:rounded-[0.385rem] tw:[&_button]:border-0 tw:[&_button]:bg-transparent
    tw:[&_button]:px-[0.923rem] tw:[&_button]:py-[0.615rem] tw:[&_button]:text-[0.769rem]/[inherit] tw:[&_button]:text-[#8b7a72]
    tw:[&_button.on]:bg-white tw:[&_button.on]:font-bold tw:[&_button.on]:text-cali-brand tw:[&_button.on]:shadow-[0_0.154rem_0.538rem_#0001]
    ${className}`} />;
}
