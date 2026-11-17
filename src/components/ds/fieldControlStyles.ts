export const controlFocus = 'tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold-accent';
export const controlFrame = `tw:box-border tw:min-w-0 tw:rounded-lg tw:border tw:border-solid
  tw:border-cali-input-line tw:bg-cali-input tw:font-cali-body tw:font-normal tw:text-cali-text
  tw:disabled:cursor-not-allowed tw:disabled:opacity-65 ${controlFocus}`;
export const controlInset = 'tw:[--ds-control-inset:calc(var(--tw-spacing)*3.5)]';
const horizontalPadding = `${controlInset} tw:px-(--ds-control-inset) tw:text-cali-body/[inherit]`;
export const fieldPadding = `${horizontalPadding} tw:py-3`;
export const compactFieldPadding = `${horizontalPadding} tw:py-2.5`;
export const bareControl = 'tw:min-w-0 tw:border-0 tw:bg-transparent tw:p-0 tw:[font-family:inherit] tw:text-inherit';
