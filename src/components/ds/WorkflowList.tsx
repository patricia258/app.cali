import type { ComponentPropsWithoutRef } from 'react';

export function WorkflowList({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`wf-records tw:overflow-hidden tw:rounded-[0.692rem] tw:border tw:border-solid
    tw:border-[#e8dfd7] tw:bg-white tw:[@media(max-width:47.5rem)]:overflow-x-auto ${className}`} />;
}

type RowProps =
  | (ComponentPropsWithoutRef<'div'> & { as?: 'div'; header?: boolean })
  | (ComponentPropsWithoutRef<'button'> & { as: 'button'; header?: false });

export function WorkflowListRow(props: RowProps) {
  const { className = '', header } = props;
  const styles = `wf-record-row tw:grid tw:w-full tw:grid-cols-[2fr_1.2fr_1fr_1fr_1.385rem] tw:items-center
    tw:gap-[1.154rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f0eae5] tw:px-[1.231rem] tw:text-left
    tw:[&>span:first-child]:flex tw:[&>span:first-child]:flex-col tw:[&>span:first-child]:gap-[0.385rem]
    tw:[&_small]:text-[0.692rem]/[inherit] tw:[&_small]:text-[#ac9f97] tw:[&_strong]:flex tw:[&_strong]:items-center
    tw:[&_strong]:gap-[0.615rem] tw:[&_strong]:text-[0.846rem]/[inherit] tw:[&_strong]:text-[#3e3533]
    tw:[@media(max-width:61.25rem)]:grid-cols-[1.6fr_1fr_1fr_1.538rem] tw:[@media(max-width:61.25rem)]:[&>span:nth-child(3)]:hidden
    tw:[@media(max-width:43.75rem)]:grid-cols-[1fr_1fr_1.385rem] tw:[@media(max-width:43.75rem)]:gap-[0.615rem]
    tw:[@media(max-width:43.75rem)]:p-4 tw:[@media(max-width:43.75rem)]:[&>span:nth-child(2)]:hidden
    tw:transition-[box-shadow,border-color] tw:duration-180 tw:motion-reduce:transition-none
    ${header ? 'header tw:bg-[#f1edeb] tw:py-[0.923rem] tw:text-[0.769rem]/[inherit] tw:text-[#978981]'
      : 'tw:bg-white tw:py-[1.308rem] tw:text-[0.846rem]/[inherit] tw:text-[#756961] tw:hover:bg-[#fbf8f5]'}
    ${className}`;

  if (props.as === 'button') {
    const { as: _as, header: _header, className: _className, ...buttonProps } = props;
    return <button type="button" {...buttonProps} className={styles} />;
  }

  const { as: _as, header: _header, className: _className, ...rowProps } = props;
  return <div {...rowProps} className={styles} />;
}
