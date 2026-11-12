import type { ComponentPropsWithoutRef } from 'react';

const emptyClass = { workflow: 'wf-empty', admin: 'v2-admin-empty' } as const;

type EmptyStateProps = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'p' | 'section';
  variant: keyof typeof emptyClass;
};

export function EmptyState({ as: Element = 'div', variant, className, ...props }: EmptyStateProps) {
  return <Element {...props} className={className ? `${emptyClass[variant]} ${className}` : emptyClass[variant]} />;
}
