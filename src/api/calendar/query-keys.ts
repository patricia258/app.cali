import type { WorkspaceRole } from '../access/profile';

type ActorId = string | null | undefined;

const workspace = (actorId: ActorId) => ['calendar', 'workspace', actorId ?? null] as const;
const googleEvents = (actorId: ActorId) => ['calendar', 'google-events', actorId ?? null] as const;
const clientGoogleEvents = (actorId: ActorId) => ['calendar', 'client-google-events', actorId ?? null] as const;

export const calendarKeys = {
  workspace,
  workspaceByRole: (actorId: ActorId, role: WorkspaceRole | null) => [...workspace(actorId), role] as const,
  googleEvents,
  googleEventsByMonth: (actorId: ActorId, year: number, month: number) => [...googleEvents(actorId), year, month] as const,
  clientGoogleEvents,
  clientGoogleEventsByRange: (actorId: ActorId, start: string, end: string) =>
    [...clientGoogleEvents(actorId), start, end] as const,
  googleEvent: (actorId: ActorId, eventId: string | undefined) =>
    ['calendar', 'google-event', actorId ?? null, eventId ?? null] as const,
  googleConnection: (actorId: ActorId, role: 'admin' | 'client') =>
    ['calendar', 'google-connection', actorId ?? null, role] as const,
  changeInbox: (actorId: ActorId) => ['calendar', 'change-inbox', actorId ?? null] as const,
  meetingRecord: (actorId: ActorId, protocol: string) => ['calendar', 'meeting-record', actorId ?? null, protocol] as const,
  meetingClassification: (actorId: ActorId, protocol: string | undefined) =>
    ['calendar', 'meeting-classification', actorId ?? null, protocol ?? null] as const,
  publishedNotices: (actorId: ActorId, role: WorkspaceRole | null) =>
    ['calendar', 'published-notices', actorId ?? null, role] as const,
  schedulingRequests: (actorId: ActorId, role: 'admin' | 'client') =>
    ['calendar', 'scheduling-requests', actorId ?? null, role] as const,
};
