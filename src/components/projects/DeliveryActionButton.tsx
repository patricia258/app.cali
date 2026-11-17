import { Button } from '../ds/Button';
import type { ComponentPropsWithoutRef } from 'react';

type DeliveryActionButtonProps = ComponentPropsWithoutRef<'button'> & { tone?: 'primary' | 'secondary' };

export function DeliveryActionButton({ tone = 'secondary', className = '', ...props }: DeliveryActionButtonProps) {
  return (
    <Button
      {...props}
      variant="unstyled"
      className={`tw:inline-flex tw:min-h-[3.077rem] tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2.5 tw:rounded-lg tw:border tw:border-solid tw:px-4.5 tw:py-2.5 tw:text-sm/[1.2] tw:font-bold tw:disabled:cursor-not-allowed tw:disabled:opacity-40 tw:[&_svg]:shrink-0 ${tone === 'primary' ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface' : 'tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:text-cali-brand'} ${className}`}
    />
  );
}
