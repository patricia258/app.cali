import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminPanelHeader({ className, ...props }: ComponentPropsWithoutRef<'header'>) {
  return <header {...props} className={`ap-pane-head tw:flex tw:items-center tw:justify-between tw:gap-[1.15rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4db] tw:pb-[1.08rem] tw:max-[47.5rem]:flex-wrap tw:[&>span]:text-[.85rem]/[inherit] tw:[&>span]:text-[#a4978c] tw:[&_:is(a,button)]:flex tw:[&_:is(a,button)]:items-center tw:[&_:is(a,button)]:gap-[.54rem] tw:[&_:is(a,button)]:text-[.85rem]/[inherit] tw:[&_:is(a,button)]:text-[#6b293e] tw:[&_button]:border-0 tw:[&_button]:bg-transparent ${className ?? ''}`} />;
}
