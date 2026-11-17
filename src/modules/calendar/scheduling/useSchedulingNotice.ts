import { useEffect, useState } from 'react';
import type { Notice } from './SchedulingNotice';

export function useSchedulingNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return [notice, setNotice] as const;
}
