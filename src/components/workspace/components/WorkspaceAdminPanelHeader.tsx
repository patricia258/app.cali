import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminPanelHeader({ className, ...props }: ComponentPropsWithoutRef<'header'>) {
  return <header {...props} className={`ap-pane-head tw:flex tw:items-center tw:justify-between tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:pb-4.5 tw:max-[47.5rem]:flex-wrap tw:[&>span]:text-sm/[inherit] tw:[&>span]:text-cali-sand-text tw:[&_:is(a,button)]:flex tw:[&_:is(a,button)]:items-center tw:[&_:is(a,button)]:gap-2 tw:[&_:is(a,button)]:text-sm/[inherit] tw:[&_:is(a,button)]:text-cali-red-strong tw:[&_button]:border-0 tw:[&_button]:bg-transparent ${className ?? ''}`} />;
}
