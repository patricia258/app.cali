export const clientKeys = {
  documents: (actorId: string | null) => ['client', 'documents', actorId] as const,
  documentComments: (actorId: string | null, documentId: string | null) => ['client', 'document-comments', actorId, documentId] as const,
  fronts: (actorId: string | null) => ['client', 'fronts', actorId] as const,
  homeTeam: (actorId: string | null, companyId: string | null) => ['client', 'home-team', actorId, companyId] as const,
  hours: (actorId: string | null, period: string) => ['client', 'hours', actorId, period] as const,
  reports: (actorId: string | null) => ['client', 'reports', actorId] as const,
};
