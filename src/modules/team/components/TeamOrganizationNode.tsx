import type { ComponentPropsWithoutRef } from 'react';

type TeamOrganizationNodeProps = ComponentPropsWithoutRef<'button'> & {
  selected: boolean;
  root?: boolean;
};

export function TeamOrganizationNode({ selected, root = false, ...props }: TeamOrganizationNodeProps) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      className={[
        'tw:flex tw:flex-col tw:items-center tw:gap-2 tw:rounded-[0.6875rem] tw:border tw:border-solid tw:px-3 tw:py-5 tw:text-[#57423f] tw:motion-safe:transition-colors tw:hover:border-cali-gold tw:hover:bg-[#fff9f2] tw:hover:shadow-[0_0.25rem_1.0625rem_#57242911]',
        'tw:[&>svg]:text-[#753a4b] tw:[&_strong]:text-[0.8125rem] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[#987f70] tw:[&>span]:text-[0.625rem] tw:[&>span]:text-[#aa9181]',
        selected
          ? 'tw:border-cali-gold tw:bg-[#fff9f2] tw:shadow-[0_0.25rem_1.0625rem_#57242911]'
          : 'tw:border-[#e6d6c8] tw:bg-white tw:shadow-[0_0.125rem_0.6875rem_#57242908]',
        root
          ? 'tw:min-w-[10.625rem]'
          : 'tw:relative tw:min-w-0 tw:before:absolute tw:before:left-1/2 tw:before:-top-6 tw:before:h-6 tw:before:w-px tw:before:bg-[#cbb8a7] tw:max-[59.375rem]:before:hidden tw:max-[37.5rem]:px-1.75 tw:max-[37.5rem]:py-3.75',
      ].join(' ')}
    />
  );
}
