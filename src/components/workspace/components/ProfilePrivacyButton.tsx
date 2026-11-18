import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../../ds/Button';

type ProfilePrivacyButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'type'> & {
  primary?: boolean;
};

export function ProfilePrivacyButton({ primary = false, ...props }: ProfilePrivacyButtonProps) {
  return (
    <Button
      {...props}
      type="button"
      variant="unstyled"
      className={`tw:inline-flex tw:h-10.5 tw:cursor-pointer tw:items-center tw:gap-2
        tw:rounded-cali-compact-control tw:border tw:border-solid tw:px-3.5
        tw:font-cali-body tw:text-cali-body tw:font-bold tw:disabled:cursor-default tw:disabled:opacity-50
        ${primary ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface' : 'tw:border-cali-input-line tw:bg-cali-neutral-surface tw:text-cali-brand'}`}
    />
  );
}
