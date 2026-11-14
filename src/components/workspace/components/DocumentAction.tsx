import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../../ds/Button';

type DocumentActionProps = ComponentPropsWithoutRef<'button'> & {
  variant: 'primary' | 'secondary';
};

export function DocumentAction({ variant, className, ...props }: DocumentActionProps) {
  const colors = variant === 'primary'
    ? 'tw:gap-[0.5625rem] tw:border-0 tw:bg-cali-brand tw:text-white tw:hover:-translate-y-px tw:hover:bg-[#481724] tw:active:translate-y-0 tw:disabled:opacity-42 tw:workspace-night:bg-[#6a253a] tw:workspace-night:hover:bg-[#7a2d44]'
    : 'tw:gap-2 tw:border tw:border-solid tw:border-[var(--v2-line,#cfbfc1)] tw:bg-[var(--v2-surface,var(--paper))] tw:text-[var(--v2-accent,var(--burgundy))] tw:hover:bg-[#faf5f2] tw:disabled:opacity-45 tw:workspace-night:border-cali-line tw:workspace-night:bg-[#241b1f] tw:workspace-night:text-cali-text tw:workspace-night:hover:bg-[#2c2126]';

  return (
    <Button
      type="button"
      {...props}
      variant="unstyled"
      data-document-action
      className={`tw:inline-flex tw:min-h-[2.1875rem] tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-[0.4375rem]
        tw:px-3 tw:py-2 tw:text-[0.6875rem]/[inherit]! tw:font-bold tw:disabled:cursor-not-allowed
        tw:[transition:transform_.16s_ease,box-shadow_.18s_ease,background_.18s_ease,border-color_.18s_ease,color_.18s_ease]
        tw:focus-visible:outline-offset-[0.1875rem] tw:focus-visible:outline-[var(--v2-gold,var(--theme-gold))]
        tw:motion-reduce:transition-none ${colors} ${className ?? ''}`}
    />
  );
}
