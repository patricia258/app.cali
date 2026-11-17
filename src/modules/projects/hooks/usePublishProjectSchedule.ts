import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { publishProjectSchedule } from '../../../api/projects/workspace';

export function usePublishProjectSchedule(onPublished: () => Promise<void>) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: (projectId) => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.adminSchedule(user?.id, projectId),
      afterSave: onPublished,
    }),
    mutationFn: async (projectId: string) => {
      const { error } = await publishProjectSchedule(projectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      await queryClient.invalidateQueries({ queryKey: scope.queryKey });
      if (scope.isCurrent()) await scope.afterSave();
    },
  });
}
