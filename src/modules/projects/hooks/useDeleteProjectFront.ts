import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { deleteProjectWorkstream } from '../../../api/projects/schedule';

export function useDeleteProjectFront(frontId: string, onSuccess: () => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({ isCurrent: captureQueryScope(queryClient), afterSave: onSuccess }),
    mutationFn: async (destinationId: string | null) => {
      const { error } = await deleteProjectWorkstream(frontId, destinationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return scope.afterSave();
    },
  });
}
