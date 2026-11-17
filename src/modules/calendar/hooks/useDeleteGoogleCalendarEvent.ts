import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifyCalendarRecordUpdated, refreshCalendarEventCache } from '../../../api/calendar/query-cache';
import { runGoogleCalendarOperation } from '../../../api/calendar/sync';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useDeleteGoogleCalendarEvent() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async ({ eventId, reason }: { eventId: string; reason: string }) => {
      await runGoogleCalendarOperation({ action: 'delete_event', eventId, reason });
    },
    onSuccess: async (_data, { eventId }, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await refreshCalendarEventCache(client, scope.actorId, eventId, true);
      if (scope.isCurrent()) notifyCalendarRecordUpdated();
    },
  });
}
