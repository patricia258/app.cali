import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { recordKeys } from '../../../../api/records/query-keys';
import { decideRecordReopen } from '../../../../api/records/closure';

export function useDecideRecordReopen(actorId: string | null | undefined, role: 'admin' | 'client', recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: recordKeys.closureScope(actorId, role, recordId),
    }),
    mutationFn: async ({ requestId, decision, note }: { requestId: string; decision: 'approved' | 'rejected'; note: string | null }) => {
      const { error } = await decideRecordReopen(requestId, decision, note);
      if (error) throw new Error(error.message || 'Não foi possível registrar a decisão.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) void queryClient.invalidateQueries({ queryKey: scope.queryKey });
    },
  });
}
