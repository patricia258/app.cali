import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authorizeGoogleCalendar, disconnectGoogleCalendar } from '../../../../api/calendar/connections';
import { calendarKeys } from '../../../../api/calendar/query-keys';
import { captureQueryScope } from '../../../../api/query-client';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useChangeClientGoogleCalendarConnection() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async ({ action, companyId }: { action: 'connect' | 'disconnect'; companyId: string }) => {
      if (action === 'disconnect') {
        await disconnectGoogleCalendar(companyId);
        return null;
      }
      return await authorizeGoogleCalendar(companyId);
    },
    onSuccess: async (url, _variables, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      if (url) {
        window.location.assign(url);
        return;
      }
      const personalEvents = { queryKey: calendarKeys.clientGoogleEvents(scope.actorId) };
      await client.cancelQueries(personalEvents);
      if (!scope.isCurrent()) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: calendarKeys.googleConnection(scope.actorId, 'client'), exact: true }),
        client.resetQueries(personalEvents),
      ]);
    },
  });
}
