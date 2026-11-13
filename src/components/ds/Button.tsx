import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const standaloneControl = 'tw:workspace-standalone:inline-flex tw:workspace-standalone:min-h-cali-control tw:workspace-standalone:items-center tw:workspace-standalone:justify-center tw:workspace-standalone:rounded-cali-control tw:workspace-standalone:font-bold';

const buttonClass = {
  unstyled: '',
  compactOutline: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[.69rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e5dbd5] tw:bg-white tw:px-[1.08rem] tw:py-[.77rem] tw:text-[.85rem]/[inherit] tw:font-semibold tw:text-[#594e4b] tw:whitespace-nowrap tw:hover:border-cali-gold',
  compactPrimary: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[.69rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1.08rem] tw:py-[.77rem] tw:text-[.85rem]/[inherit] tw:font-semibold tw:whitespace-nowrap tw:text-white',
  primary: `primary ${standaloneControl} tw:workspace-standalone:gap-[.5625rem] tw:workspace-standalone:border-0 tw:workspace-standalone:bg-cali-brand tw:workspace-standalone:px-[1.1875rem] tw:workspace-standalone:text-white tw:workspace-standalone:shadow-[0_.5rem_1.125rem_#5a1e2d2b] tw:workspace-standalone:hover:bg-(--cali-color-burgundy-deep) tw:workspace-standalone:disabled:cursor-not-allowed tw:workspace-standalone:disabled:opacity-42 tw:workspace-standalone:[&.full]:w-full tw:compact-content:inline-flex tw:compact-content:items-center tw:compact-content:justify-center tw:compact-content:gap-[.54rem] tw:compact-content:rounded-[.54rem] tw:compact-content:border tw:compact-content:border-solid tw:compact-content:border-cali-brand tw:compact-content:bg-cali-brand tw:compact-content:px-[1.08rem] tw:compact-content:py-[.77rem] tw:compact-content:text-[.85rem]/[inherit] tw:compact-content:font-semibold tw:compact-content:text-white`,
  secondary: `secondary ${standaloneControl} tw:workspace-standalone:gap-2 tw:workspace-standalone:rounded-cali-control tw:workspace-standalone:border tw:workspace-standalone:border-solid tw:workspace-standalone:border-[#cfbfc1] tw:workspace-standalone:bg-cali-paper tw:workspace-standalone:px-[1.125rem] tw:workspace-standalone:text-cali-brand tw:workspace-standalone:hover:bg-[#faf5f2] tw:workspace-standalone:disabled:cursor-not-allowed tw:workspace-standalone:disabled:opacity-45 tw:compact-content:inline-flex tw:compact-content:items-center tw:compact-content:gap-[.54rem] tw:compact-content:rounded-[.54rem] tw:compact-content:border tw:compact-content:border-solid tw:compact-content:border-[#e1d1c4] tw:compact-content:bg-white tw:compact-content:px-[1.08rem] tw:compact-content:py-[.77rem] tw:compact-content:text-[.85rem]/[inherit] tw:compact-content:text-cali-brand`,
  workflowPrimary: 'wf-primary tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.54rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1.08rem] tw:py-[.77rem] tw:text-[.85rem]/[inherit] tw:font-semibold tw:text-white tw:disabled:cursor-not-allowed tw:disabled:opacity-40',
  workflowSecondary: 'wf-secondary tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.62rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#dec9c3] tw:bg-white tw:px-[1.08rem] tw:py-[.77rem] tw:text-[.85rem]/[inherit] tw:font-bold tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-45',
  formSecondary: `tw:inline-flex! tw:items-center! tw:justify-center tw:gap-[0.538rem]!
    tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e3d6cc]!
    tw:bg-white! tw:px-[1rem]! tw:py-[0.692rem]! tw:font-cali-body
    tw:text-[0.846rem] tw:leading-normal tw:font-semibold! tw:text-cali-brand
    tw:cursor-pointer tw:transition-colors tw:duration-150
    tw:enabled:hover:border-cali-brand! tw:enabled:hover:bg-[#fbf7f3]!
    tw:disabled:cursor-default tw:disabled:opacity-45`,
  workflowOutline: 'wf-outline tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.54rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-[1.08rem] tw:py-[.77rem] tw:text-[.85rem]/[inherit] tw:font-bold tw:text-cali-brand',
  workflowIcon: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.54rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:p-[.62rem] tw:text-[.85rem]/[inherit] tw:font-bold tw:text-cali-brand',
  adminPrimary: 'tw:inline-flex tw:items-center tw:gap-[.62rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1rem] tw:py-[.77rem] tw:font-semibold tw:whitespace-nowrap tw:text-white',
  adminOutline: 'tw:inline-flex tw:items-center tw:gap-[.62rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#ead9ce] tw:bg-white tw:px-[1rem] tw:py-[.77rem] tw:font-semibold tw:whitespace-nowrap tw:text-[#603144]',
  gatePrimary: 'tw:h-[3.375rem] tw:cursor-pointer tw:rounded-[.75rem] tw:border-0 tw:bg-cali-brand tw:text-[1.077rem] tw:font-bold tw:text-white tw:disabled:cursor-default tw:disabled:opacity-45',
  gateExit: 'tw:cursor-pointer tw:self-center tw:border-0 tw:bg-transparent tw:text-[.923rem] tw:text-[#7d726b] tw:underline',
  close: 'modal-close tw:absolute tw:top-[1.231rem] tw:right-[1.385rem] tw:grid tw:cursor-pointer tw:place-items-center tw:rounded-[0.538rem] tw:border-0 tw:bg-[#f8f3ee] tw:p-[0.538rem] tw:text-cali-brand',
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
