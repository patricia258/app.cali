import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../../../api/projects/query-keys';
import { captureQueryScope } from '../../../../api/query-client';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { approveProjectSchedule } from '../../../../api/projects/schedule';

export function useApproveClientSchedule(companyId: string, projectId: string, onSaved: () => Promise<void>) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.clientScheduleScope(user?.id, projectId, companyId),
      afterSave: onSaved,
    }),
    mutationFn: async () => {
      const { error } = await approveProjectSchedule(projectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      await queryClient.invalidateQueries({ queryKey: scope.queryKey });
      if (scope.isCurrent()) await scope.afterSave();
    },
  });
}
