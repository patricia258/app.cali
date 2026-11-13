import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listRecordMessages, subscribeRecordMessages } from '../../../../api/records/conversation';
import { recordMessagesKey } from './useRefreshRecordMessages';

export function useRecordMessages(recordId: string, actorId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!actorId) return;
    return subscribeRecordMessages(recordId, (event) => {
      if (event === 'INSERT') window.dispatchEvent(new CustomEvent('cali:workspace-chime'));
      void queryClient.invalidateQueries({ queryKey: recordMessagesKey(actorId, recordId) });
    });
  }, [actorId, queryClient, recordId]);

  return useQuery({
    queryKey: recordMessagesKey(actorId, recordId),
    queryFn: async ({ signal }) => {
      const { data, error } = await listRecordMessages(recordId, signal);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: Boolean(actorId),
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
