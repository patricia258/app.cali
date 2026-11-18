import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelCalendarEvent } from '../../../api/calendar/admin';
import { notifyCalendarRecordUpdated } from '../../../api/calendar/query-cache';
import { calendarKeys } from '../../../api/calendar/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useCancelCalendarEvent() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: ({ eventId, reason }: { eventId: string; reason: string }) => cancelCalendarEvent(eventId, reason),
    onSuccess: async (_data, _variables, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await client.invalidateQueries({ queryKey: calendarKeys.workspace(scope.actorId) });
      if (scope.isCurrent()) notifyCalendarRecordUpdated();
    },
  });
}
