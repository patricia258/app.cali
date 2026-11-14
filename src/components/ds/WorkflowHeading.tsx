import type { ComponentPropsWithoutRef } from 'react';

export function WorkflowHeading({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`wf-head tw:mb-[1.308rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.385rem]
    tw:[@media(max-width:43.75rem)]:flex-col tw:[@media(max-width:43.75rem)]:items-start
    tw:[&_small]:text-[0.769rem]/[inherit] tw:[&_small]:font-bold tw:[&_small]:tracking-[0.115rem] tw:[&_small]:text-[#aa8c72]
    tw:[&_h1]:mt-[0.462rem] tw:[&_h1]:mb-[0.538rem] tw:[&_h1]:font-cali-body tw:[&_h1]:text-[2rem]/[inherit]
    tw:[&_h1]:font-bold tw:[&_h1]:tracking-[-0.062rem] tw:[&_p]:m-0 tw:[&_p]:text-[0.846rem]/[inherit] tw:[&_p]:text-[#8c8079]
    ${className}`} />;
}
