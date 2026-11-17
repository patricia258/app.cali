import type { ComponentPropsWithoutRef } from 'react';

export function WorkflowHeading({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`wf-head tw:mb-5 tw:flex tw:items-center tw:justify-between tw:gap-5.5
    tw:[@media(max-width:43.75rem)]:flex-col tw:[@media(max-width:43.75rem)]:items-start
    tw:[&_small]:text-xs/[inherit] tw:[&_small]:font-bold tw:[&_small]:tracking-widest tw:[&_small]:text-cali-warning
    tw:[&_h1]:mt-2 tw:[&_h1]:mb-2 tw:[&_h1]:font-cali-body tw:[&_h1]:text-cali-display/[inherit]
    tw:[&_h1]:font-bold tw:[&_h1]:tracking-[-0.062rem] tw:[&_p]:m-0 tw:[&_p]:text-sm/[inherit] tw:[&_p]:text-cali-muted
    ${className}`} />;
}
