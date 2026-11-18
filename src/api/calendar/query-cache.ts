import type { QueryClient, QueryFilters } from '@tanstack/react-query';
import { captureQueryScope } from '../query-client';
import { calendarKeys } from './query-keys';

export async function refreshCalendarEventCache(
  client: QueryClient,
  actorId: string,
  eventId?: string,
  deleted = false,
) {
  const isCurrent = captureQueryScope(client);
  const detail = { queryKey: calendarKeys.googleEvent(actorId, eventId), exact: true };
  if (eventId && deleted) client.removeQueries(detail);
  const filters: QueryFilters[] = [
    { queryKey: calendarKeys.workspace(actorId) },
    { queryKey: calendarKeys.googleEvents(actorId) },
    ...(eventId && !deleted ? [detail] : []),
  ];
  await Promise.all(filters.map((filter) => client.cancelQueries(filter)));
  if (isCurrent()) await Promise.all(filters.map((filter) => client.invalidateQueries(filter)));
}

export async function refreshSchedulingCache(
  client: QueryClient,
  actorId: string,
  role: 'admin' | 'client',
  eventId?: string,
) {
  await Promise.all([
    client.invalidateQueries({ queryKey: calendarKeys.schedulingRequests(actorId, role), exact: true }),
    role === 'admin' ? refreshCalendarEventCache(client, actorId, eventId) : undefined,
  ]);
}

export function notifyCalendarRecordUpdated() {
  window.dispatchEvent(new Event('cali-calendar-record-updated'));
}
