import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../../api/access/session';
import { readGoogleCalendarEvents } from '../../../../api/calendar/connections';
import { calendarKeys } from '../../../../api/calendar/query-keys';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useClientGoogleCalendarEvents(week: Date, visible: boolean) {
  const { user, role } = useWorkspaceAuth();
  const first = new Date(week.getFullYear(), week.getMonth(), week.getDate() - week.getDay());
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7);
  const start = first.toISOString();
  const end = last.toISOString();
  const enabled = visible && isSupabaseConfigured && role === 'client' && Boolean(user?.id);
  const query = useQuery({
    queryKey: calendarKeys.clientGoogleEventsByRange(user?.id, start, end),
    queryFn: ({ signal }) => readGoogleCalendarEvents('client_events', { start, end }, signal),
    enabled,
    gcTime: 0,
  });
  return enabled ? query.data : undefined;
}
