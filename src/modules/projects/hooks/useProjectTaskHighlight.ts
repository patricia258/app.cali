import { useCallback, useEffect, useRef, useState } from 'react';

export function useProjectTaskHighlight() {
  const [target, setTarget] = useState<{ id: string } | null>(null);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'center' });
    const timeout = window.setTimeout(() => setTarget(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [target]);

  const highlight = useCallback((id: string) => setTarget({ id }), []);
  const clear = useCallback(() => setTarget(null), []);
  return { id: target?.id, ref, highlight, clear };
}
