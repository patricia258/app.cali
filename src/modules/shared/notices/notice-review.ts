export const noticeCategories = [
  ['comunicado', 'Comunicado'], ['atendimento', 'Atendimento'], ['feriado', 'Feriado'],
] as const;

export type NoticeReview = {
  id: string;
  revision: number;
  category: string;
  title: string;
  body: string;
  company_ids: string[];
  notice_date: string | null;
  status: 'pending' | 'returned' | 'published';
  review_note: string | null;
};

export const noticeReviewColumns = 'id,revision,category,title,body,company_ids,notice_date,status,review_note';
export const noticeReviewStatus = {
  pending: 'Aguardando revisão',
  returned: 'Devolvido para ajuste',
  published: 'Publicado',
};
