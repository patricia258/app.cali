import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const buttonClass = {
  unstyled: '',
  primary: 'primary',
  secondary: 'secondary',
  workflowPrimary: 'wf-primary',
  workflowSecondary: 'wf-secondary',
  formSecondary: `tw:inline-flex! tw:items-center! tw:justify-center tw:gap-[0.538rem]!
    tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e3d6cc]!
    tw:bg-white! tw:px-[1rem]! tw:py-[0.692rem]! tw:font-cali-body
    tw:text-[0.846rem] tw:leading-normal tw:font-semibold! tw:text-cali-brand
    tw:cursor-pointer tw:transition-colors tw:duration-150
    tw:enabled:hover:border-cali-brand! tw:enabled:hover:bg-[#fbf7f3]!
    tw:disabled:cursor-default tw:disabled:opacity-45`,
  workflowOutline: 'wf-outline',
  adminPrimary: 'ap-primary',
  adminOutline: 'ap-outline',
  gatePrimary: 'tw:h-[3.375rem] tw:cursor-pointer tw:rounded-[.75rem] tw:border-0 tw:bg-cali-brand tw:text-[1.077rem] tw:font-bold tw:text-white tw:disabled:cursor-default tw:disabled:opacity-45',
  gateExit: 'tw:cursor-pointer tw:self-center tw:border-0 tw:bg-transparent tw:text-[.923rem] tw:text-[#7d726b] tw:underline',
  close: 'modal-close',
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
