import { useEffect, useState } from 'react';

export function useLandingSlides(count: number) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timeout = window.setTimeout(() => setActive((value) => (value + 1) % count), 4600);
    return () => window.clearTimeout(timeout);
  }, [active, count]);

  function move(direction: -1 | 1) {
    setActive((value) => (value + direction + count) % count);
  }

  return { active, select: setActive, move };
}
