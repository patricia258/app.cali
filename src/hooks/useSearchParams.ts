import { useCallback, useMemo } from 'react';
import { useLocation } from './useLocation';
import { useNavigate, type NavigationOptions } from './useNavigate';

export function useSearchParams() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const setParams = useCallback((next: URLSearchParams | Record<string, string>, options?: NavigationOptions) => {
    const query = new URLSearchParams(next).toString();
    navigate(`${pathname}${query ? `?${query}` : ''}${hash}`, options);
  }, [navigate, pathname, hash]);
  return [params, setParams] as const;
}
