import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDeliverableDependency } from '../../../api/projects/dependencies';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useAddDeliverableDependency(companyId: string, deliverableId: string, staff: boolean) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.dependencyScope(user?.id, companyId, deliverableId),
    }),
    mutationFn: async ({ title, dueDate }: { title: string; dueDate: string }) => {
      const { error } = await addDeliverableDependency(deliverableId, companyId, title, dueDate, staff, captureQueryScope(queryClient));
      if (error) throw new Error(error.message || 'Não foi possível registrar a dependência.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return queryClient.invalidateQueries({ queryKey: scope.queryKey });
    },
  });
}
