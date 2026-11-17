import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authorizeGoogleCalendar } from '../../../api/calendar/connections';
import { refreshCalendarEventCache } from '../../../api/calendar/query-cache';
import { calendarKeys } from '../../../api/calendar/query-keys';
import { runGoogleCalendarOperation } from '../../../api/calendar/sync';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useChangeAdminGoogleCalendarConnection() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async (action: 'connect' | 'disconnect') => {
      if (action === 'connect') return await authorizeGoogleCalendar(null);
      await runGoogleCalendarOperation({ action: 'disconnect', companyId: null });
      return null;
    },
    onSuccess: async (url, _action, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      if (url) {
        window.location.assign(url);
        return;
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: calendarKeys.googleConnection(scope.actorId, 'admin'), exact: true }),
        refreshCalendarEventCache(client, scope.actorId),
      ]);
    },
  });
}
