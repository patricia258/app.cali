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
        tw:data-[tone=primary]:border-cali-brand tw:data-[tone=primary]:bg-cali-brand tw:data-[tone=primary]:text-cali-neutral-surface
        tw:data-[tone=secondary]:border-[color:var(--theme-line,var(--cali-color-sand-line))] tw:data-[tone=secondary]:bg-[color:var(--theme-surface,var(--cali-color-neutral-surface))] tw:data-[tone=secondary]:text-cali-text
        tw:data-[tone=danger]:border-cali-red-soft tw:data-[tone=danger]:bg-cali-neutral-surface tw:data-[tone=danger]:text-cali-red-strong
        tw:workspace-night:data-[tone=primary]:border-cali-red-strong tw:workspace-night:data-[tone=primary]:bg-cali-red-strong
        tw:workspace-night:data-[tone=secondary]:border-cali-line-strong tw:workspace-night:data-[tone=secondary]:bg-cali-surface-muted tw:workspace-night:data-[tone=secondary]:text-cali-text
        tw:workspace-night:data-[tone=danger]:border-cali-line-strong tw:workspace-night:data-[tone=danger]:bg-cali-surface-muted tw:workspace-night:data-[tone=danger]:text-cali-text
        ${className ?? ''}`}
    />
  );
}
