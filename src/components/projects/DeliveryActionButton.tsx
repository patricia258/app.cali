import { Button } from '../ds/Button';
import type { ComponentPropsWithoutRef } from 'react';

type DeliveryActionButtonProps = ComponentPropsWithoutRef<'button'> & { tone?: 'primary' | 'secondary' };

export function DeliveryActionButton({ tone = 'secondary', className = '', ...props }: DeliveryActionButtonProps) {
  return (
    <Button
      {...props}
      variant="unstyled"
      className={`tw:inline-flex tw:min-h-[3.077rem] tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.615rem] tw:rounded-[.538rem] tw:border tw:border-solid tw:px-[1.077rem] tw:py-[.615rem] tw:text-[.846rem]/[1.2] tw:font-bold tw:disabled:cursor-not-allowed tw:disabled:opacity-40 tw:[&_svg]:shrink-0 ${tone === 'primary' ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#dec9c3] tw:bg-white tw:text-cali-brand'} ${className}`}
    />
  );
}
