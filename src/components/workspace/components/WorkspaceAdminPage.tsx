import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminPage({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`ap-app v2-admin-page tw:block tw:font-cali-body tw:text-[.92rem]/[normal] tw:text-[#302b29] tw:[&_button]:cursor-pointer tw:[&_:is(input,select,textarea):focus-visible]:outline-2 tw:[&_:is(input,select,textarea):focus-visible]:outline-offset-1 tw:[&_:is(input,select,textarea):focus-visible]:outline-cali-gold ${className ?? ''}`} />;
}
