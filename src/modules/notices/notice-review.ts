export const noticeCategories = [
  ['comunicado', 'Comunicado'], ['atendimento', 'Atendimento'], ['feriado', 'Feriado'],
] as const;

export const noticeReviewStatus = {
  pending: 'Aguardando revisão',
  returned: 'Devolvido para ajuste',
  published: 'Publicado',
};

export const noticeReviewStyles = {
  panel: 'notice-review-panel tw:my-[14px] tw:rounded-[12px] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-[16px] tw:py-[14px]',
  heading: 'tw:mx-0 tw:mt-0 tw:mb-[8px] tw:text-[1rem]',
  list: 'tw:m-0 tw:list-none tw:p-0',
  item: 'tw:flex tw:flex-wrap tw:items-center tw:gap-x-[14px] tw:gap-y-[8px] tw:py-[8px]',
};
