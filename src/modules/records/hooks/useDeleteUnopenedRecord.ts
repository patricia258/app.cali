import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { recordKeys } from '../../../api/records/query-keys';
import { deleteUnopenedRecord } from '../../../api/records/operations';

export function useDeleteUnopenedRecord(actorId: string | undefined, recordId: string, protocol: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      operationsKey: recordKeys.operations(actorId, 'client', recordId, protocol),
      messagesKey: recordKeys.messages(actorId, recordId),
      closureKey: recordKeys.closureScope(actorId, 'client', recordId),
      onDeleted,
    }),
    mutationFn: async () => {
      const { error } = await deleteUnopenedRecord(recordId);
      if (error) throw new Error(error.message || 'Não foi possível excluir esta solicitação.');
    },
    onSuccess: (_data, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      queryClient.removeQueries({ queryKey: scope.operationsKey, exact: true });
      queryClient.removeQueries({ queryKey: scope.messagesKey, exact: true });
      queryClient.removeQueries({ queryKey: scope.closureKey });
      scope.onDeleted();
    },
  });
}
