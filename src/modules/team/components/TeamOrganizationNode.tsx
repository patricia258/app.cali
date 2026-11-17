import type { ComponentPropsWithoutRef } from 'react';

type TeamOrganizationNodeProps = ComponentPropsWithoutRef<'button'> & {
  selected: boolean;
  root?: boolean;
};

export function TeamOrganizationNode({ selected, root = false, ...props }: TeamOrganizationNodeProps) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      className={[
        'tw:flex tw:flex-col tw:items-center tw:gap-2 tw:rounded-cali-panel tw:border tw:border-solid tw:px-3 tw:py-5 tw:text-cali-neutral-text tw:motion-safe:transition-colors tw:hover:border-cali-gold tw:hover:bg-cali-gold-surface tw:hover:shadow-[0_0.25rem_1.0625rem_rgb(var(--cali-rgb-burgundy-accent)/0.06667)]',
        'tw:[&>svg]:text-cali-red-strong tw:[&_strong]:text-cali-detail tw:[&_small]:text-cali-micro tw:[&_small]:text-cali-sand-text tw:[&>span]:text-cali-micro tw:[&>span]:text-cali-sand-text',
        selected
          ? 'tw:border-cali-gold tw:bg-cali-gold-surface tw:shadow-[0_0.25rem_1.0625rem_rgb(var(--cali-rgb-burgundy-accent)/0.06667)]'
          : 'tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:shadow-[0_0.125rem_0.6875rem_rgb(var(--cali-rgb-burgundy-accent)/0.03137)]',
        root
          ? 'tw:min-w-42.5'
          : 'tw:relative tw:min-w-0 tw:before:absolute tw:before:left-1/2 tw:before:-top-6 tw:before:h-6 tw:before:w-px tw:before:bg-cali-sand-accent tw:max-[59.375rem]:before:hidden tw:max-[37.5rem]:px-1.75 tw:max-[37.5rem]:py-3.75',
      ].join(' ')}
    />
  );
}
