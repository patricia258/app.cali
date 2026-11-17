import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { recordKeys } from '../../../../api/records/query-keys';
import { submitRecordFeedback } from '../../../../api/records/closure';

export function useRecordClosureFeedback(actorId: string | null | undefined, role: 'admin' | 'client', recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: recordKeys.closureScope(actorId, role, recordId),
    }),
    mutationFn: async ({ closureId, score, comment }: { closureId: string; score: number; comment: string | null }) => {
      const { error } = await submitRecordFeedback(recordId, closureId, score, comment);
      if (error) throw new Error(error.message || 'Não foi possível registrar sua avaliação.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) void queryClient.invalidateQueries({ queryKey: scope.queryKey });
    },
  });
}
