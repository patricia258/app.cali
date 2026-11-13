import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markRecordOpened, type RecordOperationsRow } from '../../../api/records/operations';

export function useMarkRecordOpened(actorId: string | undefined, recordId: string) {
  const client = useQueryClient();
  return useMutation({
    scope: { id: `record-opened:${actorId}:${recordId}` },
    mutationFn: async () => {
      const { error } = await markRecordOpened(recordId);
      if (error) throw error;
      return new Date().toISOString();
    },
    onSuccess: (openedAt) => {
      client.setQueryData<RecordOperationsRow | null>(
        ['records', 'operations', actorId, 'admin', recordId],
        (record) => record ? { ...record, first_admin_opened_at: openedAt } : record,
      );
    },
  });
}
