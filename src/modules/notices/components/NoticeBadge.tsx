import type { ComponentPropsWithoutRef } from 'react';

export type NoticeCategory = 'feriado' | 'atendimento' | 'comunicado';

export const noticeCategories = [
  ['feriado', 'Feriado'],
  ['atendimento', 'Atendimento'],
  ['comunicado', 'Comunicado'],
] satisfies [NoticeCategory, string][];

const tones: Record<NoticeCategory, string> = {
  feriado: 'tw:bg-cali-warning-surface tw:text-cali-warning',
  atendimento: 'tw:bg-cali-blue-surface tw:text-cali-blue-accent',
  comunicado: 'tw:bg-cali-violet-surface tw:text-cali-violet-text',
};

export function noticeCategoryLabel(category: NoticeCategory) {
  return noticeCategories.find(([value]) => value === category)?.[1] ?? 'Comunicado';
}

type NoticeBadgeProps = ComponentPropsWithoutRef<'span'> & {
  category: NoticeCategory;
  placement?: 'normal' | 'feed' | 'cover';
};

export function NoticeBadge({ category, placement = 'normal', className = '', ...props }: NoticeBadgeProps) {
  return (
    <span
      {...props}
      className={[
        'tw:rounded-md tw:font-bold',
        placement === 'normal' ? 'tw:px-3 tw:py-2 tw:text-xs' : 'tw:text-cali-label',
        placement === 'feed' && 'tw:px-2 tw:py-1',
        placement === 'cover' &&
          'tw:absolute tw:bottom-3 tw:left-3.5 tw:z-1 tw:px-2.5 tw:py-1.5 tw:shadow-[0_0.154rem_0.615rem_rgb(var(--cali-rgb-neutral-inverse)/0.1804)]',
        tones[category],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {noticeCategoryLabel(category)}
    </span>
  );
}
