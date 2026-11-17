import { useEffect } from 'react';
import { observeSchedulingRequests } from '../../../api/calendar/agenda';

export function useSchedulingRequestsRefresh(enabled: boolean, refresh: () => void) {
  useEffect(() => {
    if (!enabled) return;
    return observeSchedulingRequests('scheduling-requests-v65', refresh);
  }, [enabled, refresh]);
}
