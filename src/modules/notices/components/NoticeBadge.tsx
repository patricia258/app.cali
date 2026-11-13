import type { ComponentPropsWithoutRef } from 'react';

export type NoticeCategory = 'feriado' | 'atendimento' | 'comunicado';

export const noticeCategories = [
  ['feriado', 'Feriado'],
  ['atendimento', 'Atendimento'],
  ['comunicado', 'Comunicado'],
] satisfies [NoticeCategory, string][];

const tones: Record<NoticeCategory, string> = {
  feriado: 'tw:bg-[#fff4de] tw:text-[#9b6c21]',
  atendimento: 'tw:bg-[#eaf5fa] tw:text-[#34799a]',
  comunicado: 'tw:bg-[#f5effb] tw:text-[#7b56a0]',
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
        'tw:rounded-[0.385rem] tw:font-bold',
        placement === 'normal' ? 'tw:px-[0.692rem] tw:py-[0.462rem] tw:text-[0.769rem]' : 'tw:text-[0.692rem]',
        placement === 'feed' && 'tw:px-[0.462rem] tw:py-[0.308rem]',
        placement === 'cover' &&
          'tw:absolute tw:bottom-[0.769rem] tw:left-[0.923rem] tw:z-1 tw:px-[0.615rem] tw:py-[0.385rem] tw:shadow-[0_0.154rem_0.615rem_#19070a2e]',
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
