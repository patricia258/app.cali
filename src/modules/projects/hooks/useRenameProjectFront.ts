import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { renameProjectWorkstream } from '../../../api/projects/schedule';

export function useRenameProjectFront(frontId: string, onSuccess: () => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({ isCurrent: captureQueryScope(queryClient), afterSave: onSuccess }),
    mutationFn: async ({ name, objective }: { name: string; objective: string }) => {
      const { error } = await renameProjectWorkstream(frontId, name.trim(), objective.trim() || null);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return scope.afterSave();
    },
  });
}
