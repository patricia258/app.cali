import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hoursKeys } from '../../../api/hours/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { editAuditedHourEntry, type HourAuditEntry } from '../../../api/hours/audit';

export function useEditAuditedHourEntry() {
  const client = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    gcTime: 0,
    onMutate: () => ({ isCurrent: captureQueryScope(client), actorId: user?.id }),
    mutationFn: async ({ entry, reason }: { entry: HourAuditEntry; reason: string }) => {
      const { error } = await editAuditedHourEntry(entry, reason);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_result, _variables, scope) => {
      if (scope?.isCurrent()) return client.invalidateQueries({ queryKey: hoursKeys.audit(scope.actorId), exact: true });
    },
  });
}
