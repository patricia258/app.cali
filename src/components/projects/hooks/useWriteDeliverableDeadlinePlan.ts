import { useMutation, useQueryClient } from '@tanstack/react-query';
import { writeDeliverableDeadlinePlan } from '../../../api/projects/dependencies';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

type DeadlinePlan = { cause: string; steps: Parameters<typeof writeDeliverableDeadlinePlan>[2] };

export function useWriteDeliverableDeadlinePlan(companyId: string) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: ({ steps }) => ({
      isCurrent: captureQueryScope(queryClient),
      keys: steps.map(({ id }) => projectKeys.dependencyScope(user?.id, companyId, id)),
    }),
    mutationFn: async ({ cause, steps }: DeadlinePlan) => {
      const failure = await writeDeliverableDeadlinePlan(companyId, cause, steps, captureQueryScope(queryClient));
      if (failure) throw new Error(failure);
    },
    onSettled: async (_data, _error, _variables, scope) => {
      // A alteração de prazos pode concluir só parte das etapas.
      if (scope?.isCurrent()) {
        await Promise.all(scope.keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      }
    },
  });
}
