import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEvaluatorResult } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { discEvaluatorKey, type DiscEvaluatorData, type DiscEvaluatorRow } from './useDiscEvaluator';

type Update = Partial<Pick<DiscEvaluatorRow, 'team_member_id' | 'role_profile'>>;

export function useUpdateDiscEvaluator(id: string) {
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const queryKey = discEvaluatorKey(user?.id, id);
  return useMutation({
    scope: { id: `disc-evaluator:${user?.id}:${id}` },
    mutationFn: async (patch: Update) => {
      const { error } = await updateEvaluatorResult(id, patch);
      if (error) throw new Error(error.message);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<DiscEvaluatorData>(queryKey, (previous) => previous && { ...previous, row: { ...previous.row, ...patch } });
    },
  });
}
