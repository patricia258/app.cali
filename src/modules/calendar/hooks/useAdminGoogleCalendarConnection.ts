import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { authorizeGoogleCalendar } from '../../../api/calendar/connections';
import { readAdminGoogleConnection, runGoogleCalendarOperation } from '../../../api/calendar/sync';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

type GoogleConfiguration = {
  configured?: boolean;
  parts?: { clientId?: boolean; clientSecret?: boolean; redirectUri?: boolean };
};

export function useAdminGoogleCalendarConnection() {
  const { user, role } = useWorkspaceAuth();
  const client = useQueryClient();
  const key = ['calendar', 'google-connection', user?.id];
  const enabled = isSupabaseConfigured && role === 'admin' && Boolean(user?.id);
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [configuration, connection] = await Promise.all([
        runGoogleCalendarOperation({ action: 'config' }) as Promise<GoogleConfiguration | null>,
        readAdminGoogleConnection(),
      ]);
      return { configuration, connection };
    },
    staleTime: 120_000,
    enabled,
  });
  const change = useMutation({
    mutationFn: async (action: 'connect' | 'disconnect') => {
      if (action === 'connect') window.location.assign(await authorizeGoogleCalendar(null));
      else await runGoogleCalendarOperation({ action: 'disconnect', companyId: null });
    },
    onSuccess: (_value, action) => {
      if (action === 'disconnect') void client.invalidateQueries({ queryKey: key });
    },
  });
  return { query, change, enabled };
}
