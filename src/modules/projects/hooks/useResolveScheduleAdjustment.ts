import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { resolveScheduleAdjustment } from '../../../api/projects/schedule';

export function useResolveScheduleAdjustment(projectId: string, reviewId: string, accept: boolean, onSaved: () => Promise<void>) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.adminSchedule(user?.id, projectId),
      afterSave: onSaved,
    }),
    mutationFn: async (note: string) => {
      const { error } = await resolveScheduleAdjustment(reviewId, accept, note.trim());
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      await queryClient.invalidateQueries({ queryKey: scope.queryKey });
      if (scope.isCurrent()) await scope.afterSave();
    },
  });
}
