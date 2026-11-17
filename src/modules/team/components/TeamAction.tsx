import type { ComponentPropsWithoutRef } from 'react';

type TeamActionProps = ComponentPropsWithoutRef<'button'> & {
  appearance?: 'primary' | 'secondary' | 'danger' | 'download';
  location?: 'dialog' | 'page';
};

export function TeamAction({
  appearance = 'primary',
  location = 'dialog',
  type = 'button',
  className,
  ...props
}: TeamActionProps) {
  const appearanceClass = {
    primary: 'tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface',
    secondary: 'tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:text-cali-brand',
    danger: 'tw:border-cali-danger-line tw:bg-cali-neutral-surface tw:text-cali-danger',
    download: 'tw:mb-3.5 tw:min-h-11 tw:self-start tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:text-cali-brand',
  }[appearance];

  return (
    <button
      {...props}
      type={type}
      className={[
        'tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:whitespace-nowrap tw:rounded-md tw:border tw:border-solid tw:px-3.5 tw:py-2.5 tw:leading-normal tw:disabled:cursor-not-allowed tw:disabled:opacity-55 tw:motion-safe:transition-transform tw:motion-safe:hover:enabled:-translate-y-0.5',
        location === 'page'
          ? 'tw:min-h-10.5 tw:px-3 tw:py-2.25 tw:text-cali-label tw:font-bold'
          : 'tw:text-xs tw:font-normal',
        appearanceClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
