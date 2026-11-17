export const dialogFieldStyles = `
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:rounded-lg
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:border
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:border-solid
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:border-cali-line
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:bg-cali-neutral-surface
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),textarea):where(:not([data-ds-field]))]:p-3.5
  tw:workspace-compact:[&_:where(select):where(:not([data-ds-field]))]:py-3.5
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:[font:inherit]
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea):where(:not([data-ds-field]))]:text-inherit
  tw:workspace-compact:[&_:where(label)]:text-sm/[inherit]
  tw:workspace-compact:[&_:where(label)]:font-semibold
`;
