export const workspaceKeys = {
  media: (actorId: string | undefined, source?: string | null) => ['workspace', 'media', actorId ?? null, source ?? null] as const,
  mentionCandidates: (actorId?: string) => ['workspace', 'mention-candidates', actorId ?? null] as const,
};
