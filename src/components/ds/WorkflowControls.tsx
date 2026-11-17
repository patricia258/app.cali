import type { ComponentPropsWithoutRef } from 'react';

type Props = ComponentPropsWithoutRef<'div'>;

export function WorkflowControls({ className = '', ...props }: Props) {
  return <div {...props} className={`wf-controls tw:mb-4.5 tw:flex tw:min-h-[4.615rem] tw:items-center tw:gap-2.5
    tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4 tw:py-3.5
    tw:[&_strong]:text-sm/[inherit] tw:[&_strong]:text-cali-muted
    tw:[@media(max-width:47.5rem)]:flex-wrap tw:[@media(max-width:47.5rem)]:gap-y-3 ${className}`} />;
}

export function WorkflowControlsAside({ className = '', ...props }: Props) {
  return <div {...props} className={`wf-control-right tw:ml-auto tw:flex tw:items-center tw:gap-3
    tw:rounded-lg tw:bg-cali-surface-soft tw:px-3.5 tw:py-2 tw:text-cali-muted
    tw:[&_:is(input,select)]:max-w-[15.385rem] tw:[&_:is(input,select)]:border-0 tw:[&_:is(input,select)]:bg-transparent
    tw:[&_:is(input,select)]:text-sm/[inherit] tw:[&_:is(input,select)]:text-cali-muted tw:[&_:is(input,select)]:outline-none
    tw:[@media(max-width:47.5rem)]:ml-0 tw:[@media(max-width:47.5rem)]:w-full
    tw:[@media(max-width:47.5rem)]:flex-wrap tw:[@media(max-width:47.5rem)]:gap-y-2.5 ${className}`} />;
}

export function WorkflowSegments({ className = '', ...props }: Props) {
  return <div {...props} className={`wf-segments tw:flex tw:items-center tw:gap-1 tw:rounded-lg
    tw:bg-cali-surface-muted tw:p-1 tw:[@media(max-width:47.5rem)]:flex-wrap
    tw:[&_button]:rounded-md tw:[&_button]:border-0 tw:[&_button]:bg-transparent
    tw:[&_button]:px-3.5 tw:[&_button]:py-2.5 tw:[&_button]:text-xs/[inherit] tw:[&_button]:text-cali-muted
    tw:[&_button.on]:bg-cali-neutral-surface tw:[&_button.on]:font-bold tw:[&_button.on]:text-cali-brand tw:[&_button.on]:shadow-cali-segment
    ${className}`} />;
}
