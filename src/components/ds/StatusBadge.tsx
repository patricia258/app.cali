import type { ComponentPropsWithoutRef } from 'react';

const badgeClass = {
  status: 'status-chip',
  delivery: 'dv-status tw:rounded-[.538rem] tw:px-[.769rem] tw:py-[.538rem] tw:text-[.769rem]',
  admin: 'tw:inline-block tw:rounded-[.38rem] tw:px-[.62rem] tw:py-[.46rem] tw:text-[.77rem]/[inherit] tw:font-semibold tw:whitespace-nowrap',
  workflow: 'wf-tag tw:inline-flex tw:w-max tw:items-center tw:rounded-[.38rem] tw:border tw:border-solid tw:px-[.62rem] tw:py-[.38rem] tw:text-[.69rem]/[inherit] tw:font-[650] tw:whitespace-nowrap',
} as const;

const adminTones: Record<string, string> = {
  green: 'tw:bg-[#e6f6ec] tw:text-[#31805a]',
  red: 'tw:bg-[#fae9e9] tw:text-[#b7495d]',
  purple: 'tw:bg-[#f1eaff] tw:text-[#8055a5]',
  blue: 'tw:bg-[#e8f2fa] tw:text-[#3e83aa]',
  amber: 'tw:bg-[#fff2dc] tw:text-[#97672f]',
};

const deliveryTones: Record<string, string> = {
  review: 'tw:bg-[#fff0d9] tw:text-[#986523]',
  scheduled: 'tw:bg-[#f2edf9] tw:text-[#7559a6]',
};

const workflowTones: Record<string, string> = {
  purple: 'tw:border-[#e1d7f4] tw:bg-[#f1edfc] tw:text-[#795ca4]',
  blue: 'tw:border-[#cee4f4] tw:bg-[#e8f2fb] tw:text-[#507b9f]',
  green: 'tw:border-[#caebd9] tw:bg-[#e8f7ef] tw:text-[#308564]',
  yellow: 'tw:border-[#f2dfb8] tw:bg-[#fff5e0] tw:text-[#967030]',
  red: 'tw:border-[#f3d5db] tw:bg-[#fbecee] tw:text-[#b05165]',
};

type StatusBadgeProps = ComponentPropsWithoutRef<'span'> & {
  as?: 'span' | 'b';
  variant: keyof typeof badgeClass;
  tone?: string;
};

export function StatusBadge({ as: Element = 'span', variant, tone, className, ...props }: StatusBadgeProps) {
  const color = variant === 'admin'
    ? adminTones[tone ?? ''] ?? 'tw:bg-[#fff4e4] tw:text-[#9a672d]'
    : variant === 'delivery' ? deliveryTones[tone ?? ''] ?? 'tw:bg-[#e6f2fc] tw:text-[#4475a3]'
    : variant === 'workflow' ? workflowTones[tone ?? ''] ?? '' : '';
  return <Element {...props} className={[badgeClass[variant], color, className].filter(Boolean).join(' ')} />;
}
