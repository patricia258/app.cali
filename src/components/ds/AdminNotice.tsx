import type { ComponentPropsWithoutRef } from 'react';

export function AdminNotice({ success, className = '', ...props }: ComponentPropsWithoutRef<'p'> & { success?: boolean }) {
  return <p {...props} className={`tw:mx-0 tw:mt-5 tw:mb-0 tw:flex tw:items-center tw:gap-2.5
    tw:rounded-cali-panel tw:border tw:border-solid tw:px-5 tw:py-3.5 tw:text-cali-body/[inherit]
    ${success ? 'tw:border-cali-success-line tw:bg-cali-success-surface tw:text-cali-success' : 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger'}
    ${className}`} />;
}
