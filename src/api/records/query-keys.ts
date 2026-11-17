type ActorId = string | null | undefined;
type RecordRole = 'admin' | 'client';

const closureScope = (actorId: ActorId, role: RecordRole, recordId: string) =>
  ['records', 'closure', actorId ?? null, recordId, role] as const;

export const recordKeys = {
  companyHistory: (actorId: ActorId, companyId: string, role: RecordRole, staff: boolean, filter: string) =>
    ['records', 'company-history', actorId ?? null, companyId, role, staff, filter] as const,
  operations: (actorId: ActorId, role: RecordRole, recordId: string, protocol: string) =>
    ['records', 'operations', actorId ?? null, recordId, role, protocol] as const,
  timer: (actorId: ActorId, recordId: string) =>
    ['records', 'timer', actorId ?? null, recordId] as const,
  closureScope,
  closure: (actorId: ActorId, role: RecordRole, recordId: string, workflowStatus?: string | null) =>
    [...closureScope(actorId, role, recordId), workflowStatus ?? null] as const,
  messages: (actorId: ActorId, recordId: string) =>
    ['records', 'messages', actorId ?? null, recordId] as const,
  conversationIdentities: (actorId: ActorId, companyId: string, role: RecordRole) =>
    ['records', 'conversation-identities', actorId ?? null, companyId, role] as const,
};
