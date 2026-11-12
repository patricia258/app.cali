import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const buttonClass = {
  primary: 'primary',
  secondary: 'secondary',
  workflowPrimary: 'wf-primary',
  workflowSecondary: 'wf-secondary',
  workflowOutline: 'wf-outline',
  adminPrimary: 'ap-primary',
  adminOutline: 'ap-outline',
  gatePrimary: 'v2-mfa-primary',
  gateExit: 'v2-mfa-leave',
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
    />
  );
});
