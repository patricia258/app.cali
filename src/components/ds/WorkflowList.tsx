import type { ComponentPropsWithoutRef } from 'react';

export function WorkflowList({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`wf-records tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid
    tw:border-cali-line tw:bg-cali-neutral-surface tw:[@media(max-width:47.5rem)]:overflow-x-auto ${className}`} />;
}

type RowProps =
  | (ComponentPropsWithoutRef<'div'> & { as?: 'div'; header?: boolean })
  | (ComponentPropsWithoutRef<'button'> & { as: 'button'; header?: false });

export function WorkflowListRow(props: RowProps) {
  const { className = '', header } = props;
  const styles = `wf-record-row tw:grid tw:w-full tw:grid-cols-[2fr_1.2fr_1fr_1fr_1.385rem] tw:items-center
    tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-5 tw:text-left
    tw:[&>span:first-child:has(>small,>strong)]:flex tw:[&>span:first-child:has(>small,>strong)]:flex-col
    tw:[&>span:first-child:has(>small,>strong)]:gap-1.5
    tw:[&_small]:text-cali-label/[inherit] tw:[&_small]:text-cali-muted tw:[&_strong]:flex tw:[&_strong]:items-center
    tw:[&_strong]:gap-2.5 tw:[&_strong]:text-sm/[inherit] tw:[&_strong]:text-cali-text
    tw:[@media(max-width:61.25rem)]:grid-cols-[1.6fr_1fr_1fr_1.538rem] tw:[@media(max-width:61.25rem)]:[&>span:nth-child(3)]:hidden
    tw:[@media(max-width:43.75rem)]:grid-cols-[1fr_1fr_1.385rem] tw:[@media(max-width:43.75rem)]:gap-2.5
    tw:[@media(max-width:43.75rem)]:p-4 tw:[@media(max-width:43.75rem)]:[&>span:nth-child(2)]:hidden
    tw:transition-[box-shadow,border-color] tw:duration-180 tw:motion-reduce:transition-none
    ${header ? 'header tw:bg-cali-surface-muted tw:py-3.5 tw:text-xs/[inherit] tw:text-cali-muted'
      : 'tw:bg-cali-neutral-surface tw:py-5 tw:text-sm/[inherit] tw:text-cali-muted tw:hover:bg-cali-surface-soft'}
    ${className}`;

  if (props.as === 'button') {
    const { as: _as, header: _header, className: _className, ...buttonProps } = props;
    return <button type="button" {...buttonProps} className={styles} />;
  }

  const { as: _as, header: _header, className: _className, ...rowProps } = props;
  return <div {...rowProps} className={styles} />;
}
