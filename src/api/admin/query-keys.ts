export const adminKeys = {
  audit: (actorId: string | null) => ['admin', 'audit', actorId] as const,
  projectCount: (actorId: string | null) => ['admin', 'project-count', actorId] as const,
  satisfactionClosures: (actorId: string | null) => ['admin', 'satisfaction-closures', actorId] as const,
  satisfactionRatings: (actorId: string | null) => ['admin', 'satisfaction-ratings', actorId] as const,
};
