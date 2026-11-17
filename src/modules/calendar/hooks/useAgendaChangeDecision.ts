import { useMutation, useQueryClient } from '@tanstack/react-query';
import { decideAgendaChange } from '../../../api/calendar/changes';
import { notifyCalendarRecordUpdated, refreshCalendarEventCache } from '../../../api/calendar/query-cache';
import { calendarKeys } from '../../../api/calendar/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

type Decision = { id: string; eventId: string; approve: boolean; note: string; slot: number };

export function useAgendaChangeDecision() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async ({ id, approve, note, slot }: Decision) => {
      const result = await decideAgendaChange(id, approve, note, slot, captureQueryScope(client));
      if (result.error) throw new Error(result.error.message);
      return result.sync;
    },
    onSuccess: async (_data, { eventId, approve }, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: calendarKeys.changeInbox(scope.actorId), exact: true }),
        approve ? refreshCalendarEventCache(client, scope.actorId, eventId) : undefined,
      ]);
      if (approve && scope.isCurrent()) notifyCalendarRecordUpdated();
    },
  });
}
