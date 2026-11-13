import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '../../components/ds/Button';
import { FieldLabel } from '../../components/ds/FieldLabel';

export const documentInputClass = 'tw:h-[2.923rem]! tw:w-full tw:rounded-[0.538rem]! tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[0.846rem]! tw:py-0! tw:text-[0.923rem]/[inherit]! tw:font-normal tw:text-[#322f2c] tw:focus:border-cali-brand';
export const documentTextareaClass = 'tw:min-h-[6.154rem] tw:w-full tw:resize-y tw:rounded-[0.538rem]! tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[0.846rem]! tw:py-[0.769rem]! tw:text-[0.923rem]/[inherit]! tw:font-normal tw:text-[#322f2c] tw:focus:border-cali-brand';
export const documentCheckboxClass = 'tw:m-0! tw:size-[1.154rem] tw:shrink-0 tw:accent-cali-brand';

export function DocumentField({ wide, children }: { wide?: boolean; children: ReactNode }) {
  return <FieldLabel className={`tw:m-0! tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.462rem] tw:text-[0.769rem]/[inherit]! tw:font-bold tw:text-[#67574c] tw:[&>small]:font-normal tw:[&>small]:text-[#9a8c83] ${wide ? 'tw:col-span-full' : ''}`}>{children}</FieldLabel>;
}

export function DocumentActionButton({ variant, className, ...props }: Omit<ComponentPropsWithoutRef<typeof Button>, 'variant'> & {
  variant: 'primary' | 'secondary' | 'danger';
}) {
  const appearance = variant === 'primary'
    ? 'tw:border-cali-brand! tw:bg-cali-brand! tw:text-white!'
    : variant === 'danger' ? 'tw:border-[#ecd0d5]! tw:bg-white! tw:text-[#b7495d]!' : 'tw:border-[#dec9c3]! tw:bg-white! tw:text-cali-brand!';

  return <Button {...props} variant={variant === 'danger' ? 'secondary' : variant} className={`tw:inline-flex tw:h-auto tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[0.538rem] tw:rounded-[0.538rem]! tw:border tw:border-solid tw:px-[1.077rem]! tw:py-[0.769rem]! tw:text-[0.846rem]/[1.2]! tw:font-bold tw:shadow-none! tw:disabled:cursor-not-allowed tw:disabled:opacity-45 tw:[&>svg]:size-[1.077rem] tw:[&>svg]:shrink-0 ${appearance} ${className ?? ''}`} />;
}

export function DocumentOption({ label, description, ...props }: Omit<ComponentPropsWithoutRef<'input'>, 'type'> & { label: string; description: string }) {
  return <label className="tw:flex tw:cursor-pointer tw:items-start tw:gap-[0.692rem] tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-4 tw:py-[0.846rem]">
    <input className={documentCheckboxClass + ' tw:mt-[0.154rem]!'} type="checkbox" {...props} />
    <span className="tw:flex tw:flex-col tw:gap-[0.231rem]">
      <strong className="tw:text-[0.846rem]/[inherit] tw:text-[#322f2c]">{label}</strong>
      <small className="tw:text-[0.769rem]/[inherit] tw:text-[#857870]">{description}</small>
    </span>
  </label>;
}
