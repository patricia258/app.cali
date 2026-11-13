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
      className={`tw:inline-flex tw:h-[2.615rem] tw:cursor-pointer tw:items-center tw:gap-[0.462rem]
        tw:rounded-[0.615rem] tw:border tw:border-solid tw:px-[0.923rem]
        tw:font-cali-body tw:text-[0.923rem] tw:font-bold tw:disabled:cursor-default tw:disabled:opacity-50
        ${primary ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#dfd3ca] tw:bg-white tw:text-cali-brand'}`}
    />
  );
}
