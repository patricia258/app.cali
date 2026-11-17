import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hoursKeys } from '../../../api/hours/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { deleteAuditedHourEntry } from '../../../api/hours/audit';

export function useDeleteAuditedHourEntry() {
  const client = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    gcTime: 0,
    onMutate: () => ({ isCurrent: captureQueryScope(client), actorId: user?.id }),
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await deleteAuditedHourEntry(id, reason);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_result, _variables, scope) => {
      if (scope?.isCurrent()) return client.invalidateQueries({ queryKey: hoursKeys.audit(scope.actorId), exact: true });
    },
  });
}
