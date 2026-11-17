import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`ap-content tw:mx-auto tw:max-w-[126.15rem] tw:px-11 tw:pt-9 tw:pb-18.5 tw:max-[59.375rem]:p-6 tw:[.app_&]:m-0 tw:[.app_&]:max-w-none tw:[.app_&]:p-0 ${className ?? ''}`} />;
}
