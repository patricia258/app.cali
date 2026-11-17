import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const ProfileInfoSection = forwardRef<HTMLElement, Omit<ComponentPropsWithoutRef<'section'>, 'className'>>(function ProfileInfoSection(props, ref) {
  return (
    <section
      {...props}
      ref={ref}
      className="tw:mt-4.5 tw:flex tw:flex-col tw:gap-3
        tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft
        tw:px-5 tw:py-4.5 tw:text-cali-body tw:text-cali-muted
        tw:[&_strong]:inline-flex tw:[&_strong]:items-center tw:[&_strong]:gap-2
        tw:[&_strong]:text-base tw:[&_strong]:text-cali-ink
        tw:[&_p]:mx-0 tw:[&_p]:mt-1 tw:[&_p]:mb-0 tw:[&_p]:leading-normal
        tw:[&_a]:font-bold tw:[&_a]:text-cali-brand
        tw:[&_small]:font-bold tw:[&_small]:text-cali-success"
    />
  );
});
