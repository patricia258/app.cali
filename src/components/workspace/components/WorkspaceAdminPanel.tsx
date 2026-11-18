import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminPanel({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return <section {...props} className={`ap-pane tw:mb-5 tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-7 tw:[&_h2]:m-0 tw:[&_h2]:text-lg/[inherit] ${className ?? ''}`} />;
}
