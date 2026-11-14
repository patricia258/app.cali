import { useLocation as useRouterLocation, useRouter } from '@tanstack/react-router';
import { useMemo } from 'react';

export function useLocation() {
  const { history } = useRouter();
  const location = useRouterLocation();
  const raw = history.location;
  const sameEntry = raw.state.__TSR_key === location.state.__TSR_key;
  const pathname = sameEntry ? raw.pathname : location.pathname;
  const search = sameEntry ? raw.search : location.searchStr;
  const fragment = location.href.match(/#.*$/)?.[0] ?? '';
  const hash = sameEntry ? raw.hash : fragment;
  const entryKey = location.state.__TSR_key;
  return useMemo(() => ({ pathname, search, hash, entryKey }), [pathname, search, hash, entryKey]);
}
