import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { discKeys } from '../../../api/disc/query-keys';
import { updateEvaluatorResult } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { DiscEvaluatorData, DiscEvaluatorRow } from './useDiscEvaluator';

type Update = Partial<Pick<DiscEvaluatorRow, 'team_member_id' | 'role_profile'>>;

export function useUpdateDiscEvaluator(id: string) {
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const queryKey = discKeys.evaluator(user?.id, id);
  return useMutation({
    scope: { id: `disc-evaluator:${user?.id}:${id}` },
    gcTime: 0,
    mutationFn: async (patch: Update) => {
      const { error } = await updateEvaluatorResult(id, patch);
      if (error) throw new Error(error.message);
    },
    onMutate: () => ({ isCurrent: captureQueryScope(queryClient), actorId: user?.id, queryKey }),
    onSuccess: async (_result, patch, scope) => {
      if (!scope?.isCurrent()) return;
      await queryClient.cancelQueries({ queryKey: scope.queryKey, exact: true });
      if (!scope.isCurrent()) return;
      queryClient.setQueryData<DiscEvaluatorData>(scope.queryKey, (previous) => previous && {
        ...previous, row: { ...previous.row, ...patch },
      });
      if (patch.team_member_id !== undefined) {
        await queryClient.invalidateQueries({ queryKey: discKeys.memberHistories(scope.actorId) });
      }
    },
  });
}
