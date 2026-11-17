import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { recordKeys } from '../../../../api/records/query-keys';
import { deleteRecordMessage } from '../../../../api/records/conversation';

export function useDeleteRecordMessage(actorId: string | undefined, recordId: string, messageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: recordKeys.messages(actorId, recordId),
    }),
    gcTime: 0,
    mutationFn: async () => {
      const { error } = await deleteRecordMessage(messageId);
      if (error) throw new Error(`Não foi possível excluir a mensagem. ${error.message}`);
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return queryClient.invalidateQueries({ queryKey: scope.queryKey, exact: true });
    },
  });
}
