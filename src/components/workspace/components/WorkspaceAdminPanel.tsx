import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminPanel({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return <section {...props} className={`ap-pane tw:mb-[1.23rem] tw:min-w-0 tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white tw:p-[1.77rem] tw:[&_h2]:m-0 tw:[&_h2]:text-[1.15rem]/[inherit] ${className ?? ''}`} />;
}
