import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readPartnerTimer, touchPartnerTimer, type ActivePartnerTimer, type PartnerTimerState,
} from '../../../../api/partner/timer';

export function usePartnerTimer() {
  const [state, setState] = useState<PartnerTimerState>({ active: null, recoveries: [] });
  const [now, setNow] = useState(Date.now());
  const sequence = useRef(0);
  const active = useRef<ActivePartnerTimer | null>(null);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const next = await readPartnerTimer();
    if (request !== sequence.current || !next) return;
    active.current = next.active;
    setState(next);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let interactedAt = 0;
    let touchedAt = 0;
    let pending = false;
    const markActivity = () => { if (document.visibilityState === 'visible') interactedAt = Date.now(); };
    const synchronize = () => { if (document.visibilityState === 'visible') void refresh(); };
    const heartbeat = async () => {
      const timer = active.current;
      const instant = Date.now();
      if (!timer || timer.status !== 'active' || pending
        || document.visibilityState !== 'visible' || instant - interactedAt > 90_000
        || instant - touchedAt < 90_000 || instant >= Date.parse(timer.warningAt)) return;
      touchedAt = instant;
      pending = true;
      try {
        await touchPartnerTimer(timer.id, false);
        await refresh();
      } catch { /* heartbeat seguinte reavalia presença e sessão */ }
      finally { pending = false; }
    };
    void refresh();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(synchronize, 12_000);
    const activity = window.setInterval(() => void heartbeat(), 15_000);
    window.addEventListener('pointerdown', markActivity);
    window.addEventListener('keydown', markActivity);
    window.addEventListener('focus', synchronize);
    window.addEventListener('cali-staff-timer-changed', synchronize);
    document.addEventListener('visibilitychange', synchronize);
    return () => {
      sequence.current++;
      window.clearInterval(clock);
      window.clearInterval(poll);
      window.clearInterval(activity);
      window.removeEventListener('pointerdown', markActivity);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('focus', synchronize);
      window.removeEventListener('cali-staff-timer-changed', synchronize);
      document.removeEventListener('visibilitychange', synchronize);
    };
  }, [refresh]);

  return { ...state, now, refresh };
}
