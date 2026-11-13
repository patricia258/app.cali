import type { ComponentPropsWithoutRef } from 'react';

const emptyClass = {
  workflow: 'wf-empty tw:p-[1.85rem] tw:text-center tw:text-[#999]',
  admin: 'v2-admin-empty tw:m-0 tw:px-[0.308rem] tw:pt-8 tw:pb-[0.615rem] tw:text-[0.923rem]/[inherit] tw:text-[#978980]',
} as const;

type EmptyStateProps = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'p' | 'section';
  variant: keyof typeof emptyClass;
};

export function EmptyState({ as: Element = 'div', variant, className, ...props }: EmptyStateProps) {
  return <Element {...props} className={className ? `${emptyClass[variant]} ${className}` : emptyClass[variant]} />;
}
