type ActorId = string | null | undefined;
type ProjectRole = 'admin' | 'client';

const clientScheduleScope = (actorId: ActorId, projectId: string, companyId: string) =>
  ['projects', 'client-schedule-review', actorId ?? null, projectId, companyId] as const;
const dependencyScope = (actorId: ActorId, companyId: string, deliverableId: string) =>
  ['projects', 'dependencies', actorId ?? null, companyId, deliverableId] as const;
const conversationScope = (actorId: ActorId, companyId: string, deliverableId: string) =>
  ['projects', 'conversation', actorId ?? null, companyId, deliverableId] as const;

export const projectKeys = {
  adminSchedule: (actorId: ActorId, projectId: string) =>
    ['projects', 'admin-schedule-review', actorId ?? null, projectId] as const,
  clientScheduleScope,
  clientSchedule: (actorId: ActorId, projectId: string, companyId: string, status?: string | null) =>
    [...clientScheduleScope(actorId, projectId, companyId), status ?? null] as const,
  adminLifecycle: (actorId: ActorId, projectId: string | null) =>
    ['projects', 'admin-lifecycle', actorId ?? null, projectId] as const,
  clientLifecycle: (actorId: ActorId, companyId: string, projectId: string | null) =>
    ['projects', 'client-lifecycle', actorId ?? null, companyId, projectId] as const,
  deliveryHistory: (actorId: ActorId, projectId: string) =>
    ['projects', 'delivery-history', actorId ?? null, projectId] as const,
  dependencyScope,
  dependencies: (actorId: ActorId, companyId: string, deliverableId: string, mode: ProjectRole | 'staff') =>
    [...dependencyScope(actorId, companyId, deliverableId), mode] as const,
  conversationScope,
  conversationMessages: (actorId: ActorId, companyId: string, deliverableId: string, visible: boolean) =>
    [...conversationScope(actorId, companyId, deliverableId), 'messages', visible] as const,
  conversationCount: (actorId: ActorId, companyId: string, deliverableId: string) =>
    [...conversationScope(actorId, companyId, deliverableId), 'count'] as const,
  conversationIdentities: (actorId: ActorId, companyId: string, role: ProjectRole) =>
    ['projects', 'conversation-identities', actorId ?? null, companyId, role] as const,
};
