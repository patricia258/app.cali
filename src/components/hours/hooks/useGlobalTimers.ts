import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { hoursKeys } from '../../../api/hours/query-keys';
import { useEffect } from 'react';
import { hoursAvailable } from '../../../api/hours/client';
import { readGlobalTimers } from '../../../api/hours/timer-context';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export type GlobalTimer = Awaited<ReturnType<typeof readGlobalTimers>>[number];

export function useGlobalTimers(actorId?: string) {
  const client = useQueryClient();
  useEffect(() => {
    if (!actorId || !hoursAvailable) return;
    const refresh = () => void client.invalidateQueries({ queryKey: hoursKeys.globalTimers(actorId), exact: true });
    window.addEventListener(TIMER_EVENT, refresh);
    return () => window.removeEventListener(TIMER_EVENT, refresh);
  }, [actorId, client]);
  return useQuery({
    queryKey: hoursKeys.globalTimers(actorId),
    queryFn: actorId && hoursAvailable ? ({ signal }) => readGlobalTimers(actorId, signal) : skipToken,
    refetchInterval: 15000,
  });
}
