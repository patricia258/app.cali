import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { recordKeys } from '../../../../api/records/query-keys';
import { requestRecordReopen } from '../../../../api/records/closure';

export function useRequestRecordReopen(actorId: string | null | undefined, role: 'admin' | 'client', recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: recordKeys.closureScope(actorId, role, recordId),
    }),
    mutationFn: async (reason: string) => {
      const { error } = await requestRecordReopen(recordId, reason);
      if (error) throw new Error(error.message || 'Não foi possível solicitar a reabertura.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) void queryClient.invalidateQueries({ queryKey: scope.queryKey });
    },
  });
}
