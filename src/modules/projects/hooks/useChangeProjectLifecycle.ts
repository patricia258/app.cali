import { useMutation } from '@tanstack/react-query';
import { changeProjectLifecycle, type ProjectLifecycleAction, type ProjectLifecycleScope } from '../../../api/projects/lifecycle';

type Change = {
  action: ProjectLifecycleAction;
  scope: ProjectLifecycleScope;
  scopeId: string | null;
  reason: string;
  resumeDate: string | null;
};

export function useChangeProjectLifecycle(projectId: string, onSaved: () => Promise<void>) {
  return useMutation({
    mutationFn: async ({ action, scope, scopeId, reason, resumeDate }: Change) => {
      const { error } = await changeProjectLifecycle(projectId, action, scope, scopeId, reason, resumeDate);
      if (error) throw new Error(error.message);
    },
    onSuccess: onSaved,
  });
}
