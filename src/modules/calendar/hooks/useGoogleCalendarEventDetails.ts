import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readAdminGoogleConnection, readGoogleCalendarEvent, refreshGoogleCalendarEvent } from '../../../api/calendar/sync';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useGoogleCalendarEventDetails(id?: string) {
  const { user, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['calendar', 'google-event', user?.id, id],
    enabled: isSupabaseConfigured && role === 'admin' && Boolean(user?.id && id),
    queryFn: async () => {
      if (!id) return null;
      const { data: stored, error } = await readGoogleCalendarEvent({ id });
      if (error) throw error;
      if (!stored) return null;
      const refreshed = stored.google_event_id ? await refreshGoogleCalendarEvent(id) : null;
      const updated = refreshed ? (await readGoogleCalendarEvent({ id })).data : null;
      const connection = await readAdminGoogleConnection();
      const attendees = new Map<string, string>(
        (refreshed?.attendees || []).map((item: { email?: string; status?: string }) => [
          (item.email ?? '').trim().toLowerCase(), item.status ?? 'pending',
        ]),
      );
      return { event: updated ?? stored, account: connection?.account_email, attendees };
    },
  });
}
