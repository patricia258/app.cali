import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../api/supabase';

type ActiveTimer = {
  id: string;
  companyId: string;
  description: string | null;
  status: 'active' | 'paused';
  startedAt: string;
  pausedSeconds: number;
  warningAt: string;
  pauseAt: string;
};
export type TimerRecovery = {
  id: string;
  companyId: string;
  description: string | null;
  startedAt: string;
  countedUntil: string;
  seconds: number;
  minutes: number;
};
type TimerState = { active: ActiveTimer | null; recoveries: TimerRecovery[] };

export function usePartnerTimer() {
  const [state, setState] = useState<TimerState>({ active: null, recoveries: [] });
  const [now, setNow] = useState(Date.now());
  const sequence = useRef(0);
  const active = useRef<ActiveTimer | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const request = ++sequence.current;
    const { data, error } = await supabase.rpc('read_partner_timer_state_v2');
    if (error || request !== sequence.current || !data) return;
    const next = data as TimerState;
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
      if (!supabase || !timer || timer.status !== 'active' || pending
        || document.visibilityState !== 'visible' || instant - interactedAt > 90_000
        || instant - touchedAt < 90_000 || instant >= Date.parse(timer.warningAt)) return;
      touchedAt = instant;
      pending = true;
      try {
        const { error } = await supabase.rpc('touch_partner_timer_v2', { p_timer_id: timer.id, p_confirm_presence: false });
        if (!error) await refresh();
      } finally { pending = false; }
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
