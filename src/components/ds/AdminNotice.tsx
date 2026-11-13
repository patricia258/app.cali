import type { ComponentPropsWithoutRef } from 'react';

export function AdminNotice({ success, className = '', ...props }: ComponentPropsWithoutRef<'p'> & { success?: boolean }) {
  return <p {...props} className={`tw:mx-0 tw:mt-[1.231rem] tw:mb-0 tw:flex tw:items-center tw:gap-[0.615rem]
    tw:rounded-[0.692rem] tw:border tw:border-solid tw:px-[1.231rem] tw:py-[0.923rem] tw:text-[0.923rem]/[inherit]
    ${success ? 'tw:border-[#d6e8dd] tw:bg-[#f1f8f3] tw:text-[#42785a]' : 'tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:text-[#9d4b64]'}
    ${className}`} />;
}
