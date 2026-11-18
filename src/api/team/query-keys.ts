export const teamKeys = {
  directory: (actorId: string, companyId: string, role: 'admin' | 'client' | 'partner') =>
    ['team', 'directory', actorId, companyId, role] as const,
};
