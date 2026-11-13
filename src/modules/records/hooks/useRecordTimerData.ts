import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readRecordTimerData } from '../../../api/records/operations';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useRecordTimerData(actorId: string | undefined, recordId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['records', 'timer', actorId, recordId] as const;
  useEffect(() => {
    if (!actorId) return;
    const refresh = () => void queryClient.invalidateQueries({ queryKey });
    window.addEventListener(TIMER_EVENT, refresh);
    return () => window.removeEventListener(TIMER_EVENT, refresh);
  }, [actorId, queryClient, recordId]);

  return useQuery({
    queryKey,
    queryFn: actorId ? () => readRecordTimerData(recordId) : skipToken,
  });
}
