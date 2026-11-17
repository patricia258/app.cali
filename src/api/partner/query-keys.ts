export const partnerKeys = {
  workspace: (actorId?: string) => ['partner', 'workspace', actorId ?? null] as const,
};
