const projectTimers = (actorId: string | undefined, companyId: string | undefined) =>
  ['hours', 'project-timer', actorId ?? null, companyId ?? null] as const;

export const hoursKeys = {
  audit: (actorId?: string) => ['hours', 'audit', actorId ?? null] as const,
  globalTimers: (actorId?: string) => ['hours', 'global-timers', actorId ?? null] as const,
  projectTimers,
  projectTimer: (actorId: string | undefined, companyId: string | undefined, deliverableId: string | undefined) =>
    [...projectTimers(actorId, companyId), deliverableId ?? null] as const,
};
