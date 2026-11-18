import { useState } from 'react';

export function useProjectFrontExpansion(storageKey: string | null) {
  const [expanded, setExpanded] = useState(() => {
    try { return Boolean(storageKey && sessionStorage.getItem(storageKey) === '1'); }
    catch { return false; }
  });

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    try { if (storageKey) sessionStorage.setItem(storageKey, next ? '1' : '0'); }
    catch { /* A sessão atual continua funcionando sem armazenamento. */ }
  }

  return { expanded, toggle };
}
