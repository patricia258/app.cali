import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '../../components/ds/Button';
import { FieldLabel } from '../../components/ds/FieldLabel';

export const documentInputClass = 'tw:h-11.5! tw:w-full tw:rounded-lg! tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5! tw:py-0! tw:text-cali-body/[inherit]! tw:font-normal tw:text-cali-text tw:focus:border-cali-brand';
export const documentTextareaClass = 'tw:min-h-[6.154rem] tw:w-full tw:resize-y tw:rounded-lg! tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5! tw:py-3! tw:text-cali-body/[inherit]! tw:font-normal tw:text-cali-text tw:focus:border-cali-brand';
export const documentCheckboxClass = 'tw:m-0! tw:size-4.5 tw:shrink-0 tw:accent-cali-brand';

export function DocumentField({ wide, children }: { wide?: boolean; children: ReactNode }) {
  return <FieldLabel className={`tw:m-0! tw:flex tw:min-w-0 tw:flex-col tw:gap-2 tw:text-xs/[inherit]! tw:font-bold tw:text-cali-muted tw:[&>small]:font-normal tw:[&>small]:text-cali-muted ${wide ? 'tw:col-span-full' : ''}`}>{children}</FieldLabel>;
}

export function DocumentActionButton({ variant, className, ...props }: Omit<ComponentPropsWithoutRef<typeof Button>, 'variant'> & {
  variant: 'primary' | 'secondary' | 'danger';
}) {
  const appearance = variant === 'primary'
    ? 'tw:border-cali-brand! tw:bg-cali-brand! tw:text-cali-neutral-surface!'
    : variant === 'danger' ? 'tw:border-cali-danger-line! tw:bg-cali-neutral-surface! tw:text-cali-danger!' : 'tw:border-cali-line-strong! tw:bg-cali-neutral-surface! tw:text-cali-brand!';

  return <Button {...props} variant={variant === 'danger' ? 'secondary' : variant} className={`tw:inline-flex tw:h-auto tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg! tw:border tw:border-solid tw:px-4.5! tw:py-3! tw:text-sm/[1.2]! tw:font-bold tw:shadow-none! tw:disabled:cursor-not-allowed tw:disabled:opacity-45 tw:[&>svg]:size-4.5 tw:[&>svg]:shrink-0 ${appearance} ${className ?? ''}`} />;
}

export function DocumentOption({ label, description, ...props }: Omit<ComponentPropsWithoutRef<'input'>, 'type'> & { label: string; description: string }) {
  return <label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-3 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-4 tw:py-3.5">
    <input className={documentCheckboxClass + ' tw:mt-0.5!'} type="checkbox" {...props} />
    <span className="tw:flex tw:flex-col tw:gap-1">
      <strong className="tw:text-sm/[inherit] tw:text-cali-text">{label}</strong>
      <small className="tw:text-xs/[inherit] tw:text-cali-muted">{description}</small>
    </span>
  </label>;
}
