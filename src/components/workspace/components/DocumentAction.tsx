import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../../ds/Button';

type DocumentActionProps = ComponentPropsWithoutRef<'button'> & {
  variant: 'primary' | 'secondary';
};

export function DocumentAction({ variant, className, ...props }: DocumentActionProps) {
  const colors = variant === 'primary'
    ? 'tw:gap-2 tw:border-0 tw:bg-cali-brand tw:text-cali-neutral-surface tw:hover:-translate-y-px tw:hover:bg-cali-burgundy-text tw:active:translate-y-0 tw:disabled:opacity-42 tw:workspace-night:bg-cali-red-strong tw:workspace-night:hover:bg-cali-red-strong'
    : 'tw:gap-2 tw:border tw:border-solid tw:border-[var(--v2-line,var(--cali-color-neutral-line))] tw:bg-[var(--v2-surface,var(--paper))] tw:text-[var(--v2-accent,var(--burgundy))] tw:hover:bg-cali-surface-soft tw:disabled:opacity-45 tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface tw:workspace-night:text-cali-text tw:workspace-night:hover:bg-cali-surface-muted';

  return (
    <Button
      type="button"
      {...props}
      variant="unstyled"
      data-document-action
      className={`tw:inline-flex tw:min-h-[2.1875rem] tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md
        tw:px-3 tw:py-2 tw:text-cali-label/[inherit]! tw:font-bold tw:disabled:cursor-not-allowed
        tw:[transition:transform_.16s_ease,box-shadow_.18s_ease,background_.18s_ease,border-color_.18s_ease,color_.18s_ease]
        tw:focus-visible:outline-offset-[0.1875rem] tw:focus-visible:outline-[var(--v2-gold,var(--theme-gold))]
        tw:motion-reduce:transition-none ${colors} ${className ?? ''}`}
    />
  );
}
