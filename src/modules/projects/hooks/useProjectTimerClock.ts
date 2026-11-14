import { useEffect, useState } from 'react';

export function useProjectTimerClock(active: boolean) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [active]);

  return now;
}
