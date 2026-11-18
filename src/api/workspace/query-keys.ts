export const workspaceKeys = {
  profile: (actorId?: string) => ['workspace', 'profile', actorId ?? null] as const,
  media: (actorId: string | undefined, source?: string | null) => ['workspace', 'media', actorId ?? null, source ?? null] as const,
  mentionCandidates: (actorId?: string) => ['workspace', 'mention-candidates', actorId ?? null] as const,
};
