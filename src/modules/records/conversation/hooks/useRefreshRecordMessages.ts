import { useQueryClient } from '@tanstack/react-query';

export function recordMessagesKey(actorId?: string, recordId?: string) {
  return ['records', 'messages', actorId, recordId] as const;
}

export function useRefreshRecordMessages(actorId?: string) {
  const queryClient = useQueryClient();
  return (recordId: string) => queryClient.invalidateQueries({ queryKey: recordMessagesKey(actorId, recordId) });
}
