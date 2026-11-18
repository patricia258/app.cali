import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const standaloneControl = 'tw:workspace-standalone:inline-flex tw:workspace-standalone:min-h-cali-control tw:workspace-standalone:items-center tw:workspace-standalone:justify-center tw:workspace-standalone:rounded-cali-control tw:workspace-standalone:font-bold';

const buttonClass = {
  unstyled: '',
  compactOutline: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:font-semibold tw:text-cali-muted tw:whitespace-nowrap tw:hover:border-cali-gold',
  compactPrimary: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:font-semibold tw:whitespace-nowrap tw:text-cali-neutral-surface',
  primary: `primary ${standaloneControl} tw:workspace-standalone:gap-2 tw:workspace-standalone:border-0 tw:workspace-standalone:bg-cali-brand tw:workspace-standalone:px-5 tw:workspace-standalone:text-cali-neutral-surface tw:workspace-standalone:shadow-cali-control tw:workspace-standalone:hover:bg-(--cali-color-burgundy-deep) tw:workspace-standalone:disabled:cursor-not-allowed tw:workspace-standalone:disabled:opacity-42 tw:workspace-standalone:[&.full]:w-full tw:compact-content:inline-flex tw:compact-content:items-center tw:compact-content:justify-center tw:compact-content:gap-2 tw:compact-content:rounded-lg tw:compact-content:border tw:compact-content:border-solid tw:compact-content:border-cali-brand tw:compact-content:bg-cali-brand tw:compact-content:px-4.5 tw:compact-content:py-3 tw:compact-content:text-sm/[inherit] tw:compact-content:font-semibold tw:compact-content:text-cali-neutral-surface`,
  secondary: `secondary ${standaloneControl} tw:workspace-standalone:gap-2 tw:workspace-standalone:rounded-cali-control tw:workspace-standalone:border tw:workspace-standalone:border-solid tw:workspace-standalone:border-cali-line-strong tw:workspace-standalone:bg-cali-paper tw:workspace-standalone:px-4.5 tw:workspace-standalone:text-cali-brand tw:workspace-standalone:hover:bg-cali-surface-soft tw:workspace-standalone:disabled:cursor-not-allowed tw:workspace-standalone:disabled:opacity-45 tw:compact-content:inline-flex tw:compact-content:items-center tw:compact-content:gap-2 tw:compact-content:rounded-lg tw:compact-content:border tw:compact-content:border-solid tw:compact-content:border-cali-line-strong tw:compact-content:bg-cali-neutral-surface tw:compact-content:px-4.5 tw:compact-content:py-3 tw:compact-content:text-sm/[inherit] tw:compact-content:text-cali-brand`,
  workflowPrimary: 'wf-primary tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:font-semibold tw:text-cali-neutral-surface tw:disabled:cursor-not-allowed tw:disabled:opacity-40',
  workflowSecondary: 'wf-secondary tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2.5 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:font-bold tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-45',
  formSecondary: `tw:inline-flex! tw:items-center! tw:justify-center tw:gap-2!
    tw:rounded-lg tw:border tw:border-solid tw:border-cali-input-line!
    tw:bg-cali-neutral-surface! tw:px-4! tw:py-3! tw:font-cali-body
    tw:text-sm tw:leading-normal tw:font-semibold! tw:text-cali-brand
    tw:cursor-pointer tw:transition-colors tw:duration-150
    tw:enabled:hover:border-cali-brand! tw:enabled:hover:bg-cali-surface-soft!
    tw:disabled:cursor-default tw:disabled:opacity-45`,
  workflowOutline: 'wf-outline tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:font-bold tw:text-cali-brand',
  workflowIcon: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-2.5 tw:text-sm/[inherit] tw:font-bold tw:text-cali-brand',
  adminPrimary: 'tw:inline-flex tw:items-center tw:gap-2.5 tw:rounded-lg tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-4 tw:py-3 tw:font-semibold tw:whitespace-nowrap tw:text-cali-neutral-surface',
  adminOutline: 'tw:inline-flex tw:items-center tw:gap-2.5 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4 tw:py-3 tw:font-semibold tw:whitespace-nowrap tw:text-cali-brand',
  gatePrimary: 'tw:h-13.5 tw:cursor-pointer tw:rounded-xl tw:border-0 tw:bg-cali-brand tw:text-lg tw:font-bold tw:text-cali-neutral-surface tw:disabled:cursor-default tw:disabled:opacity-45',
  gateExit: 'tw:cursor-pointer tw:self-center tw:border-0 tw:bg-transparent tw:text-cali-body tw:text-cali-muted tw:underline',
  close: 'modal-close tw:absolute tw:top-5 tw:right-5.5 tw:grid tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border-0 tw:bg-cali-day-canvas tw:p-2 tw:text-cali-brand',
  inlineClose: 'modal-close-static',
} as const;

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant: keyof typeof buttonClass;
  pending?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, pending, className, disabled, 'aria-busy': ariaBusy, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const closesDialog = variant === 'close' || variant === 'inlineClose';
  const focusStyle = 'tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent';
  const classes = [buttonClass[variant], className, focusStyle].filter(Boolean).join(' ');

  return (
    <button
      {...props}
      ref={ref}
      className={classes}
      disabled={disabled || pending}
      aria-busy={pending || ariaBusy}
      aria-label={ariaLabel ?? (closesDialog ? 'Fechar' : undefined)}
      data-dialog-close={closesDialog ? '' : undefined}
    />
  );
});
