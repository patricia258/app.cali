import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { hoursAvailable } from '../../../api/hours/client';
import { readGlobalTimers } from '../../../api/hours/timer-context';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export type GlobalTimer = Awaited<ReturnType<typeof readGlobalTimers>>[number];

export function useGlobalTimers(actorId?: string) {
  const client = useQueryClient();
  const queryKey = ['hours', 'global-timers', actorId] as const;
  useEffect(() => {
    if (!actorId || !hoursAvailable) return;
    const refresh = () => void client.invalidateQueries({ queryKey });
    window.addEventListener(TIMER_EVENT, refresh);
    return () => window.removeEventListener(TIMER_EVENT, refresh);
  }, [actorId, client]);
  return useQuery({
    queryKey,
    queryFn: actorId && hoursAvailable ? () => readGlobalTimers(actorId) : skipToken,
    refetchInterval: 15000,
  });
}
