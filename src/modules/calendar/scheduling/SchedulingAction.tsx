import type { ComponentPropsWithoutRef } from 'react';

type Props = ComponentPropsWithoutRef<'button'> & {
  size?: 'normal' | 'compact' | 'body';
  tone?: 'primary' | 'secondary' | 'danger';
};

export function SchedulingAction({ tone = 'secondary', size = 'normal', type = 'button', className, ...props }: Props) {
  return (
    <button
      {...props}
      type={type}
      data-tone={tone}
      data-size={size}
      className={`
        tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:px-4 tw:leading-[normal]
        tw:data-[size=body]:text-base/[inherit] tw:data-[size=compact]:text-sm/[inherit]
        tw:data-[size=compact]:data-[tone=primary]:rounded-lg tw:data-[size=compact]:data-[tone=primary]:font-semibold
        tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent
        tw:disabled:cursor-default tw:disabled:opacity-45
        tw:data-[tone=primary]:border-cali-brand tw:data-[tone=primary]:bg-cali-brand tw:data-[tone=primary]:text-white
        tw:data-[tone=secondary]:border-[color:var(--theme-line,#e9dbd0)] tw:data-[tone=secondary]:bg-[color:var(--theme-surface,#fff)] tw:data-[tone=secondary]:text-cali-text
        tw:data-[tone=danger]:border-[#dfc3c9] tw:data-[tone=danger]:bg-[#fff9fa] tw:data-[tone=danger]:text-[#8b3246]
        tw:workspace-night:data-[tone=primary]:border-[#7a2942] tw:workspace-night:data-[tone=primary]:bg-[#7a2942]
        tw:workspace-night:data-[tone=secondary]:border-[#554047] tw:workspace-night:data-[tone=secondary]:bg-[#2c2024] tw:workspace-night:data-[tone=secondary]:text-[#eee3e6]
        tw:workspace-night:data-[tone=danger]:border-[#554047] tw:workspace-night:data-[tone=danger]:bg-[#2c2024] tw:workspace-night:data-[tone=danger]:text-[#eee3e6]
        ${className ?? ''}`}
    />
  );
}
