import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../../api/projects/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { changeProjectLifecycle, type ProjectLifecycleAction, type ProjectLifecycleScope } from '../../../api/projects/lifecycle';

type Change = {
  action: ProjectLifecycleAction;
  scope: ProjectLifecycleScope;
  scopeId: string | null;
  reason: string;
  resumeDate: string | null;
};

export function useChangeProjectLifecycle(projectId: string, onSaved: () => Promise<void>) {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: projectKeys.adminLifecycle(user?.id, projectId),
      afterSave: onSaved,
    }),
    mutationFn: async ({ action, scope, scopeId, reason, resumeDate }: Change) => {
      const { error } = await changeProjectLifecycle(projectId, action, scope, scopeId, reason, resumeDate);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      await queryClient.invalidateQueries({ queryKey: scope.queryKey });
      if (scope.isCurrent()) await scope.afterSave();
    },
  });
}
