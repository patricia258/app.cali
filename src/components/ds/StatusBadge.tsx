import type { ComponentPropsWithoutRef } from 'react';

const badgeClass = { status: 'status-chip', delivery: 'dv-status' } as const;

type StatusBadgeProps = ComponentPropsWithoutRef<'span'> & {
  as?: 'span' | 'b';
  variant: keyof typeof badgeClass;
};

export function StatusBadge({ as: Element = 'span', variant, className, ...props }: StatusBadgeProps) {
  return <Element {...props} className={className ? `${badgeClass[variant]} ${className}` : badgeClass[variant]} />;
}
