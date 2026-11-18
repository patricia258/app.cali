import { useEffect } from 'react';
import { hoursAvailable } from '../../../api/hours/client';
import { touchActiveTimers } from '../../../api/hours/timers';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
const maximumIdleTime = 5 * 60_000;
const heartbeatInterval = 2 * 60_000;

export function useTimerPresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !hoursAvailable) return;

    let lastActivity = Date.now();
    const markActivity = () => { lastActivity = Date.now(); };
    const heartbeat = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastActivity > maximumIdleTime) return;
      void touchActiveTimers().catch(() => undefined);
    };

    let pendingHeartbeat = window.setTimeout(heartbeat, 4000);
    const heartbeatAfterTimerChange = () => {
      window.clearTimeout(pendingHeartbeat);
      pendingHeartbeat = window.setTimeout(heartbeat, 1500);
    };
    const heartbeatTimer = window.setInterval(heartbeat, heartbeatInterval);
    for (const name of activityEvents) {
      window.addEventListener(name, markActivity, { passive: true, capture: true });
    }
    window.addEventListener(TIMER_EVENT, heartbeatAfterTimerChange);

    return () => {
      window.clearTimeout(pendingHeartbeat);
      window.clearInterval(heartbeatTimer);
      window.removeEventListener(TIMER_EVENT, heartbeatAfterTimerChange);
      for (const name of activityEvents) window.removeEventListener(name, markActivity, true);
    };
  }, [enabled]);
}
