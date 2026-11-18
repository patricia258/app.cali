import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '../../ds/Button';

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <span className="v2-row-actions tw:inline-flex tw:justify-end tw:gap-2">{children}</span>;
}

type AdminRowButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'className'> & {
  withText?: boolean;
};

export function AdminRowButton({ withText = false, ...props }: AdminRowButtonProps) {
  return (
    <Button
      {...props}
      type="button"
      variant="unstyled"
      className={`tw:h-9 tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-cali-line
        tw:bg-cali-neutral-surface tw:text-cali-brand tw:hover:bg-cali-danger-surface
        ${withText
          ? 'v2-row-text tw:inline-flex tw:w-auto tw:items-center tw:gap-1.5 tw:px-3 tw:py-0 tw:text-sm/[inherit] tw:font-bold tw:whitespace-nowrap'
          : 'tw:grid tw:w-9 tw:place-items-center tw:p-0'}`}
    />
  );
}
