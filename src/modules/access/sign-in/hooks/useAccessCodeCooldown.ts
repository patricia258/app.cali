import { useEffect, useState } from 'react';

const resendIntervalMs = 120_000;

export function useAccessCodeCooldown(email: string) {
  const [deadlines, setDeadlines] = useState(() => new Map<string, number>());
  const [now, setNow] = useState(Date.now);
  const deadline = deadlines.get(email.trim().toLowerCase()) ?? 0;
  const secondsRemaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const hasActiveCooldown = [...deadlines.values()].some((time) => time > now);

  useEffect(() => {
    if (!hasActiveCooldown) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [hasActiveCooldown]);

  function startCooldown(address: string) {
    const requestedAt = Date.now();
    const key = address.trim().toLowerCase();
    setNow(requestedAt);
    setDeadlines((previous) => new Map(previous).set(key, requestedAt + resendIntervalMs));
  }

  return { secondsRemaining, startCooldown };
}
