import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const ProfileInfoSection = forwardRef<HTMLElement, Omit<ComponentPropsWithoutRef<'section'>, 'className'>>(function ProfileInfoSection(props, ref) {
  return (
    <section
      {...props}
      ref={ref}
      className="tw:mt-[1.077rem] tw:flex tw:flex-col tw:gap-[0.769rem]
        tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e8ddd4] tw:bg-[#fbf7f4]
        tw:px-[1.231rem] tw:py-[1.077rem] tw:text-[0.962rem] tw:text-[#5f5650]
        tw:[&_strong]:inline-flex tw:[&_strong]:items-center tw:[&_strong]:gap-[0.462rem]
        tw:[&_strong]:text-[1rem] tw:[&_strong]:text-cali-ink
        tw:[&_p]:mx-0 tw:[&_p]:mt-[0.308rem] tw:[&_p]:mb-0 tw:[&_p]:leading-normal
        tw:[&_a]:font-bold tw:[&_a]:text-cali-brand
        tw:[&_small]:font-bold tw:[&_small]:text-[#356448]"
    />
  );
});
