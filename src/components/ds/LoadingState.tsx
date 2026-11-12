import type { ComponentPropsWithoutRef } from 'react';

export function LoadingState({ className, role = 'status', 'aria-busy': ariaBusy = true, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} role={role} aria-busy={ariaBusy} className={className ? `data-loading ${className}` : 'data-loading'} />;
}
