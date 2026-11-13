import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../../../components/ds/Button';

export function HoursActionButton({ primary, className, ...props }: ComponentPropsWithoutRef<'button'> & { primary?: boolean }) {
  return (
    <Button
      {...props}
      variant="unstyled"
      className={`tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:px-4 tw:py-3 tw:text-[.846rem] tw:leading-[inherit] tw:font-bold tw:disabled:cursor-not-allowed tw:disabled:opacity-45 ${primary ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#dec9c3] tw:bg-white tw:text-cali-brand'} ${className ?? ''}`}
    />
  );
}
