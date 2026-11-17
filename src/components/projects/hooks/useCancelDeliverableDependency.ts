import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelDeliverableDependency } from '../../../api/projects/dependencies';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useCancelDeliverableDependency(companyId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.dependencyScope(user?.id, companyId, deliverableId),
    }),
    mutationFn: async (id: string) => {
      const { error } = await cancelDeliverableDependency(id);
      if (error) throw new Error(error.message || 'Não foi possível cancelar a dependência.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return queryClient.invalidateQueries({ queryKey: scope.queryKey });
    },
  });
}
