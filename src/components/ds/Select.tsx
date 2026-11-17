import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { bareControl, controlFocus, controlFrame, controlInset } from './fieldControlStyles';

const arrow = `tw:appearance-none tw:bg-no-repeat tw:bg-size-[calc(var(--tw-spacing)*3.5)]
  tw:bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='2.5%204.5%2011%208'%3E%3Cpath%20d='m3%206%205%205%205-5'%20fill='none'%20stroke='CanvasText'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E")]
  tw:workspace-night:bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='2.5%204.5%2011%208'%20style='color-scheme:dark'%3E%3Cpath%20d='m3%206%205%205%205-5'%20fill='none'%20stroke='CanvasText'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E")]
  tw:[background-position:right_var(--ds-control-inset)_center]
  tw:ps-(--ds-control-inset) tw:pe-[calc(var(--ds-control-inset)+var(--tw-spacing)*5)]
  tw:forced-colors:appearance-auto tw:forced-colors:bg-none tw:workspace-night:forced-colors:bg-none
  tw:forced-colors:pe-(--ds-control-inset)`;

const styles = {
  field: `${controlFrame} tw:min-h-13 tw:py-3 tw:text-cali-body/[inherit]`,
  compact: `${controlFrame} tw:min-h-11 tw:py-2.5 tw:text-cali-body/[inherit]`,
  filter: `${controlFrame} tw:py-2 tw:text-sm/[inherit]`,
  bare: `${bareControl} ${controlFocus}`,
  embedded: controlFocus,
};

type SelectProps = ComponentPropsWithoutRef<'select'> & { variant?: keyof typeof styles };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { variant = 'field', multiple, size, className = '', ...props },
  ref,
) {
  const listbox = multiple || (size !== undefined && size > 1);

  return (
    <select {...props} ref={ref} multiple={multiple} size={size} data-ds-control="select" data-ds-field={variant !== "embedded" ? "" : undefined}
      className={`${styles[variant]} ${controlInset} ${listbox ? 'tw:px-(--ds-control-inset)' : arrow} ${className}`} />
  );
});
