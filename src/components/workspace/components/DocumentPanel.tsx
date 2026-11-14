import type { ComponentPropsWithoutRef } from 'react';

const panelPadding = {
  standard: 'tw:p-[1.5625rem] tw:[@media(max-width:38.75rem)]:p-5',
  content: 'tw:p-5!',
  loading: 'tw:p-10.5!',
} as const;

type DocumentPanelProps = ComponentPropsWithoutRef<'section'> & {
  as?: 'section' | 'aside' | 'div';
  padding?: 'standard' | 'content' | 'loading';
};

export function DocumentPanel({ as: Element = 'section', padding = 'standard', className, ...props }: DocumentPanelProps) {
  return (
    <Element
      {...props}
      className={`panel tw:min-w-0 tw:rounded-[0.5625rem]! tw:border tw:border-solid tw:border-[var(--v2-line)]!
        tw:bg-[var(--v2-surface)]! tw:shadow-none! tw:backdrop-blur-[0.625rem]
        tw:[transition:background-color_.22s_ease,background_.22s_ease,color_.22s_ease,border-color_.22s_ease,box-shadow_.22s_ease,transform_.18s_ease]
        tw:active:[transform:translateY(-0.0625rem)_scale(.998)] tw:motion-reduce:transition-none tw:print:break-inside-avoid
        tw:[@media(hover:hover)_and_(pointer:fine)]:hover:[transform:translateY(-0.1875rem)]
        tw:[&_h2]:text-[clamp(1.125rem,1.6vw,1.375rem)]!
        ${panelPadding[padding]}
        ${className ?? ''}`}
    />
  );
}
