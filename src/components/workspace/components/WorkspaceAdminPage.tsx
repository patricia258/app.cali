import type { ComponentPropsWithoutRef } from 'react';

export function WorkspaceAdminPage({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`ap-app v2-admin-page tw:block tw:font-cali-body tw:text-cali-body/[normal] tw:text-cali-text tw:[&_button]:cursor-pointer tw:[&_:is(input,select,textarea):focus-visible]:outline-2 tw:[&_:is(input,select,textarea):focus-visible]:outline-offset-1 tw:[&_:is(input,select,textarea):focus-visible]:outline-cali-gold ${className ?? ''}`} />;
}
