import type { MaterialComplexity } from '../../domain/projects';

export type ProjectForm = { companyId: string; name: string; startDate: string; endDate: string; clientResponseBusinessDays: number };
export type FrontForm = { name: string; objective: string; monthStart: number; monthEnd: number };
export type FrontDraft = FrontForm & { id: string };
export type DeliverableForm = {
  title: string; description: string; frontId: string; complexity: MaterialComplexity;
  monthStart: number; monthEnd: number; dueDate: string; isDocument: boolean; clientVisible: boolean;
};
