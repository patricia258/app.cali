import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readRecordOperations, subscribeRecordOperations } from '../../../api/records/operations';

export function useRecordOperations(role: 'admin' | 'client', actorId: string | undefined, recordId: string, protocol: string) {
  const queryClient = useQueryClient();
  const queryKey = ['records', 'operations', actorId, role, recordId] as const;
  const enabled = Boolean(actorId && protocol.startsWith('CALI-REG-'));
  const query = useQuery({
    queryKey,
    queryFn: enabled ? () => readRecordOperations(protocol) : skipToken,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeRecordOperations(recordId, () => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }, [actorId, enabled, queryClient, recordId, role]);

  return query;
}
