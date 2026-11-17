import { recordKeys } from '../../../api/records/query-keys';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readRecordTimerData } from '../../../api/records/operations';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useRecordTimerData(actorId: string | undefined, recordId: string) {
  const queryClient = useQueryClient();
  const queryKey = recordKeys.timer(actorId, recordId);
  useEffect(() => {
    if (!actorId) return;
    const refresh = () => void queryClient.invalidateQueries({ queryKey });
    window.addEventListener(TIMER_EVENT, refresh);
    return () => window.removeEventListener(TIMER_EVENT, refresh);
  }, [actorId, queryClient, recordId]);

  return useQuery({
    queryKey,
    queryFn: actorId ? ({ signal }) => readRecordTimerData(recordId, actorId, signal) : skipToken,
  });
}
