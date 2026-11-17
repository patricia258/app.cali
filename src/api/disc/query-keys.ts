const managementReports = (actorId?: string) => ['disc', 'management-report', actorId ?? null] as const;
const memberHistories = (actorId?: string) => ['disc', 'member-history', actorId ?? null] as const;

export const discKeys = {
  evaluator: (actorId: string | undefined, id: string) => ['disc', 'evaluator', actorId ?? null, id] as const,
  memberHistories,
  memberHistory: (actorId: string | undefined, memberId: string) => [...memberHistories(actorId), memberId] as const,
  managementCatalog: (actorId?: string) => ['disc', 'management-catalog', actorId ?? null] as const,
  managementReports,
  managementReport: (actorId: string | undefined, role: string | null, linkId: string) =>
    [...managementReports(actorId), role, linkId] as const,
  respondentQuestionnaire: (slug: string, inviteToken: string) => ['disc', 'respondent-questionnaire', null, slug, inviteToken || null] as const,
};
