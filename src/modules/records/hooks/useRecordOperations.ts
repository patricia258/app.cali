import { recordKeys } from '../../../api/records/query-keys';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readRecordOperations, subscribeRecordOperations } from '../../../api/records/operations';

export function useRecordOperations(role: 'admin' | 'client', actorId: string | undefined, recordId: string, protocol: string) {
  const queryClient = useQueryClient();
  const queryKey = recordKeys.operations(actorId, role, recordId, protocol);
  const enabled = Boolean(actorId && protocol.startsWith('CALI-REG-'));
  const query = useQuery({
    queryKey,
    queryFn: enabled ? ({ signal }) => readRecordOperations(protocol, signal) : skipToken,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeRecordOperations(recordId, () => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }, [actorId, enabled, protocol, queryClient, recordId, role]);

  return query;
}
