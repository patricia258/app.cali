import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readGoogleCalendarEvents, type GoogleCalendarEvent } from '../../../api/calendar/connections';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { WorkspaceCalendarEvent } from '../../../domain/calendar';

const emptyEvents: WorkspaceCalendarEvent[] = [];

function monthStart(year: number, month: number) {
  const date = new Date(year, month, 1);
  const monthNumber = String(date.getMonth() + 1).padStart(2, '0');
  return new Date(`${date.getFullYear()}-${monthNumber}-01T00:00:00-03:00`).toISOString();
}

function mapGoogleEvent(row: GoogleCalendarEvent): WorkspaceCalendarEvent {
  return {
    id: `google:${row.calendarId}:${row.id}`,
    title: row.title,
    startsAt: row.allDay ? `${row.start}T12:00:00-03:00` : row.start,
    endsAt: row.allDay && row.end ? `${row.end}T12:00:00-03:00` : row.end,
    allDay: Boolean(row.allDay),
    type: 'other',
    color: /^#[0-9a-f]{6}$/i.test(row.color) ? row.color : '#8D7354',
    textColor: row.textColor ?? undefined,
    location: row.location,
    description: row.description,
    organizer: row.organizer,
    reminderMinutes: row.reminderMinutes ?? undefined,
    meetingUrl: row.meetingUrl,
    attendees: (row.attendees ?? []).map((guest) => ({
      name: String(guest.name || guest.email || 'Convidado'),
      email: String(guest.email || ''),
      status: guest.status === 'accepted' || guest.status === 'declined' || guest.status === 'tentative'
        ? guest.status : 'pending',
    })),
    googleEventId: row.id,
    googleHtmlLink: row.htmlLink,
    visibility: 'internal',
    sourceType: 'google',
    synthetic: true,
  };
}

export function useAdminGoogleCalendarEvents(cursor: Date, staff: boolean) {
  const { user, role } = useWorkspaceAuth();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const enabled = Boolean(isSupabaseConfigured && !staff && role === 'admin' && user?.id);
  const query = useQuery({
    queryKey: ['calendar', 'admin-google-events', user?.id, year, month],
    enabled,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      // The Google endpoint limits each request to 62 days.
      const results = await Promise.all([-1, 0, 1].map(offset => readGoogleCalendarEvents('events', {
        start: monthStart(year, month + offset),
        end: monthStart(year, month + offset + 1),
      }, signal)));
      if (results.some(result => result.data?.state === 'reconnect_required')) {
        return { status: 'reconnect' as const, events: emptyEvents };
      }
      if (results.some(result => result.error || result.data?.state !== 'checked')) {
        return { status: 'unavailable' as const, events: emptyEvents };
      }
      const events = new Map<string, WorkspaceCalendarEvent>();
      for (const { data } of results) {
        if (data?.state !== 'checked') continue;
        for (const row of data.events) {
          const event = mapGoogleEvent(row);
          if (!events.has(event.id)) events.set(event.id, event);
        }
      }
      return { status: 'ready' as const, events: [...events.values()] };
    },
  });
  return { ...query, status: enabled ? query.data?.status ?? 'loading' as const : 'unavailable' as const };
}
