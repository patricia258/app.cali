import { useEffect } from 'react';
import { observeSchedulingRequests } from '../../../api/calendar/agenda';

export function useSchedulingRequestsRefresh(enabled: boolean, refresh: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const stop = observeSchedulingRequests('scheduling-requests-v65', refresh);
    window.addEventListener('cali-calendar-record-updated', refresh);
    return () => {
      stop();
      window.removeEventListener('cali-calendar-record-updated', refresh);
    };
  }, [enabled, refresh]);
}
