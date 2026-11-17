import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestAgendaChange } from '../../../../api/calendar/changes';
import { notifyCalendarRecordUpdated, refreshSchedulingCache } from '../../../../api/calendar/query-cache';
import { captureQueryScope } from '../../../../api/query-client';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useRequestClientAgendaChange() {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async (input: Parameters<typeof requestAgendaChange>) => {
      const { error } = await requestAgendaChange(...input);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, _input, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await refreshSchedulingCache(client, scope.actorId, 'client');
      if (scope.isCurrent()) notifyCalendarRecordUpdated();
    },
  });
}
