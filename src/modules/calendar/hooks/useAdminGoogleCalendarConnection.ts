import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { calendarKeys } from '../../../api/calendar/query-keys';
import { readAdminGoogleConnection, runGoogleCalendarOperation } from '../../../api/calendar/sync';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

type GoogleConfiguration = {
  configured?: boolean;
  parts?: { clientId?: boolean; clientSecret?: boolean; redirectUri?: boolean };
};

export function useAdminGoogleCalendarConnection() {
  const { user, role } = useWorkspaceAuth();
  const enabled = isSupabaseConfigured && role === 'admin' && Boolean(user?.id);
  const query = useQuery({
    queryKey: calendarKeys.googleConnection(user?.id, 'admin'),
    queryFn: async ({ signal }) => {
      const [configuration, connection] = await Promise.all([
        runGoogleCalendarOperation({ action: 'config' }, signal) as Promise<GoogleConfiguration | null>,
        readAdminGoogleConnection(signal),
      ]);
      return { configuration, connection };
    },
    staleTime: 120_000,
    enabled,
  });
  return { query, enabled };
}
