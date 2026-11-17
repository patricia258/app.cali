import type { ComponentPropsWithoutRef } from 'react';

const emptyClass = {
  workflow: 'wf-empty tw:p-7.5 tw:text-center tw:text-cali-muted',
  admin: 'v2-admin-empty tw:m-0 tw:px-1 tw:pt-8 tw:pb-2.5 tw:text-cali-body/[inherit] tw:text-cali-muted',
} as const;

type EmptyStateProps = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'p' | 'section';
  variant: keyof typeof emptyClass;
};

export function EmptyState({ as: Element = 'div', variant, className, ...props }: EmptyStateProps) {
  return <Element {...props} className={className ? `${emptyClass[variant]} ${className}` : emptyClass[variant]} />;
}
