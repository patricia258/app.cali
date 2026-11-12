export type MaterialKind = 'report' | 'proposal' | 'mapa';

export const materialModule = { report: 'reports', proposal: 'proposals', mapa: 'people_map' };
export const materialText = { report: 'Síntese executiva', proposal: 'Texto da proposta', mapa: 'Parecer da devolutiva' };
export const materialStatus = { assigned: 'Atribuído', pending: 'Em revisão', returned: 'Devolvido para ajuste', accepted: 'Aprovado' };

export type MaterialReview = {
  id: string;
  kind: MaterialKind;
  title: string;
  company_id: string;
  author_id: string;
  context: string;
  draft_text: string | null;
  status: keyof typeof materialStatus;
  revision: number;
  decision_note: string | null;
};
export const materialReviewColumns = 'id,kind,title,company_id,author_id,context,draft_text,status,revision,decision_note';
