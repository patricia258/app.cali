import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { hoursAvailable } from '../../../api/hours/client';
import { readProjectTimerContext } from '../../../api/hours/timer-context';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useProjectTimerContext(actorId?: string, companyId?: string, deliverableId?: string) {
  const queryClient = useQueryClient();
  const ready = Boolean(hoursAvailable && actorId && companyId && deliverableId);

  useEffect(() => {
    if (!ready) return;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ['hours', 'project-timer', actorId, companyId] });
    window.addEventListener(TIMER_EVENT, refresh);
    return () => window.removeEventListener(TIMER_EVENT, refresh);
  }, [actorId, companyId, queryClient, ready]);

  return useQuery({
    queryKey: ['hours', 'project-timer', actorId, companyId, deliverableId],
    queryFn: hoursAvailable && actorId && companyId && deliverableId
      ? ({ signal }) => readProjectTimerContext(actorId, companyId, deliverableId, signal)
      : skipToken,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}
