export const dialogFieldStyles = `
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:rounded-lg
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:border
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:border-solid
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:border-cali-line
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:bg-cali-neutral-surface
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:p-3.5
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:[font:inherit]
  tw:workspace-compact:[&_:where(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:text-inherit
  tw:workspace-compact:[&_:where(label)]:text-sm/[inherit]
  tw:workspace-compact:[&_:where(label)]:font-semibold
`;
