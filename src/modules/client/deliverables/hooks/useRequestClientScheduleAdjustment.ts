import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../../../api/projects/query-keys';
import { captureQueryScope } from '../../../../api/query-client';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { requestScheduleAdjustment, type ScheduleAdjustment } from '../../../../api/projects/schedule';

export function useRequestClientScheduleAdjustment(companyId: string, onSaved: () => Promise<void>) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: (input) => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.clientScheduleScope(user?.id, input.p_project_id, companyId),
      afterSave: onSaved,
    }),
    mutationFn: async (input: ScheduleAdjustment) => {
      const { error } = await requestScheduleAdjustment(input);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      await queryClient.invalidateQueries({ queryKey: scope.queryKey });
      if (scope.isCurrent()) await scope.afterSave();
    },
  });
}
