import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`ap-content tw:mx-auto tw:max-w-[126.15rem] tw:px-[2.69rem] tw:pt-[2.23rem] tw:pb-[4.62rem] tw:max-[59.375rem]:p-[1.54rem] tw:[.app_&]:m-0 tw:[.app_&]:max-w-none tw:[.app_&]:p-0 ${className ?? ''}`} />;
}
