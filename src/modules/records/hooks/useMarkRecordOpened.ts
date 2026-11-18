import { recordKeys } from '../../../api/records/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { markRecordOpened, type RecordOperationsRow } from '../../../api/records/operations';

export function useMarkRecordOpened(actorId: string | undefined, recordId: string, protocol: string) {
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(client),
      queryKey: recordKeys.operations(actorId, 'admin', recordId, protocol),
    }),
    scope: { id: `record-opened:${actorId}:${recordId}` },
    mutationFn: async () => {
      const { error } = await markRecordOpened(recordId);
      if (error) throw error;
      return new Date().toISOString();
    },
    onSuccess: async (openedAt, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      await client.cancelQueries({ queryKey: scope.queryKey, exact: true });
      if (!scope.isCurrent()) return;
      client.setQueryData<RecordOperationsRow | null>(
        scope.queryKey,
        (record) => record ? { ...record, first_admin_opened_at: openedAt } : record,
      );
    },
  });
}
