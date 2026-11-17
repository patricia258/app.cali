import { recordKeys } from '../../../../api/records/query-keys';
import { useQueryClient } from '@tanstack/react-query';

export function useRefreshRecordMessages(actorId?: string) {
  const queryClient = useQueryClient();
  return (recordId: string) => queryClient.invalidateQueries({ queryKey: recordKeys.messages(actorId, recordId) });
}
