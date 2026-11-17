import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markDeliverableDependencyReceived } from '../../../api/projects/dependencies';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useReceiveDeliverableDependency(companyId: string, deliverableId: string, staff: boolean) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.dependencyScope(user?.id, companyId, deliverableId),
    }),
    mutationFn: async (id: string) => {
      const { error } = await markDeliverableDependencyReceived(id, staff);
      if (error) throw new Error(error.message || 'Não foi possível marcar como recebido.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return queryClient.invalidateQueries({ queryKey: scope.queryKey });
    },
  });
}
