import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readRecordClosureContext, subscribeRecordClosure } from '../../../../api/records/closure';
import { recordKeys } from '../../../../api/records/query-keys';

export function useRecordClosureContext(
  actorId: string | null | undefined,
  role: 'admin' | 'client',
  selection: string,
  workflowStatus?: string | null,
) {
  const queryClient = useQueryClient();
  const active = Boolean(actorId && selection);
  const query = useQuery({
    queryKey: recordKeys.closure(actorId, role, selection, workflowStatus),
    queryFn: ({ signal }) => readRecordClosureContext(selection, role, signal),
    enabled: active,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (current) => {
      const closure = current.state.data?.closure;
      return active && role === 'client' && closure && !closure.answered_at && !closure.closed_unanswered_at ? 60_000 : false;
    },
  });

  useEffect(() => {
    if (!selection || !actorId) return;
    return subscribeRecordClosure(selection, () => {
      void queryClient.invalidateQueries({ queryKey: recordKeys.closureScope(actorId, role, selection) });
    });
  }, [actorId, queryClient, role, selection]);

  return query;
}
