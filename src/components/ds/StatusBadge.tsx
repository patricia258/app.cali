import type { ComponentPropsWithoutRef } from 'react';

const badgeClass = {
  status: 'status-chip',
  delivery: 'dv-status tw:rounded-lg tw:px-3 tw:py-2 tw:text-xs',
  admin: 'tw:inline-block tw:rounded-md tw:px-2.5 tw:py-2 tw:text-xs/[inherit] tw:font-semibold tw:whitespace-nowrap',
  workflow: 'wf-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-md tw:border tw:border-solid tw:px-2.5 tw:py-1.5 tw:text-cali-label/[inherit] tw:font-[650] tw:whitespace-nowrap',
} as const;

const adminTones: Record<string, string> = {
  green: 'tw:bg-cali-success-surface tw:text-cali-success',
  red: 'tw:bg-cali-danger-surface tw:text-cali-danger',
  purple: 'tw:bg-cali-scheduled-surface tw:text-cali-scheduled',
  blue: 'tw:bg-cali-info-surface tw:text-cali-info',
  amber: 'tw:bg-cali-warning-surface tw:text-cali-warning',
};

const deliveryTones: Record<string, string> = {
  review: 'tw:bg-cali-warning-surface tw:text-cali-warning',
  scheduled: 'tw:bg-cali-scheduled-surface tw:text-cali-scheduled',
};

const workflowTones: Record<string, string> = {
  purple: 'tw:border-cali-scheduled-line tw:bg-cali-scheduled-surface tw:text-cali-scheduled',
  blue: 'tw:border-cali-info-line tw:bg-cali-info-surface tw:text-cali-info',
  green: 'tw:border-cali-success-line tw:bg-cali-success-surface tw:text-cali-success',
  yellow: 'tw:border-cali-warning-line tw:bg-cali-warning-surface tw:text-cali-warning',
  red: 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger',
};

type StatusBadgeProps = ComponentPropsWithoutRef<'span'> & {
  as?: 'span' | 'b';
  variant: keyof typeof badgeClass;
  tone?: string;
};

export function StatusBadge({ as: Element = 'span', variant, tone, className, ...props }: StatusBadgeProps) {
  const color = variant === 'admin'
    ? adminTones[tone ?? ''] ?? 'tw:bg-cali-warning-surface tw:text-cali-warning'
    : variant === 'delivery' ? deliveryTones[tone ?? ''] ?? 'tw:bg-cali-info-surface tw:text-cali-info'
    : variant === 'workflow' ? workflowTones[tone ?? ''] ?? '' : '';
  return <Element {...props} className={[badgeClass[variant], color, className].filter(Boolean).join(' ')} />;
}
