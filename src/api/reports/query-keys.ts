const tracking = (actorId?: string) => ['reports', 'tracking', actorId ?? null] as const;
const clientHistories = (actorId?: string) => ['reports', 'client-history', actorId ?? null] as const;

export const reportsKeys = {
  tracking,
  tracked: (actorId: string | undefined, protocol?: string) => [...tracking(actorId), protocol ?? null] as const,
  clientHistories,
  clientHistory: (actorId: string | undefined, companyId: string) => [...clientHistories(actorId), companyId] as const,
  withdrawable: (actorId?: string) => ['reports', 'withdrawable', actorId ?? null] as const,
  paperIdentity: (actorId: string | undefined, protocol: string) => ['reports', 'paper-identity', actorId ?? null, protocol] as const,
  paperAgenda: (actorId: string | undefined, protocol: string) => ['reports', 'paper-agenda', actorId ?? null, protocol] as const,
  paperVisits: (actorId: string | undefined, protocol: string, companyId?: string, periodStart?: string, periodEnd?: string, approvedAt?: string | null) =>
    ['reports', 'paper-visits', actorId ?? null, protocol, companyId ?? null, periodStart ?? null, periodEnd ?? null, approvedAt ?? null] as const,
};
