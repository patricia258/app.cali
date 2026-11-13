import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '../../ds/Button';

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <span className="v2-row-actions tw:inline-flex tw:justify-end tw:gap-[0.462rem]">{children}</span>;
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
      className={`tw:h-[2.308rem] tw:cursor-pointer tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e5d9d0]
        tw:bg-white tw:text-cali-brand tw:hover:bg-[#f6edf0]
        ${withText
          ? 'v2-row-text tw:inline-flex tw:w-auto tw:items-center tw:gap-[0.385rem] tw:px-[0.769rem] tw:py-0 tw:text-[0.846rem]/[inherit] tw:font-bold tw:whitespace-nowrap'
          : 'tw:grid tw:w-[2.308rem] tw:place-items-center tw:p-0'}`}
    />
  );
}
