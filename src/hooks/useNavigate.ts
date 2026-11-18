import { useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

export type NavigationOptions = { replace?: boolean; replaceIfSame?: boolean };

export function useNavigate() {
  const { history } = useRouter();

  // Keep complete URLs from existing callers intact, including repeated search keys.
  return useCallback((to: string | -1, { replace, replaceIfSame }: NavigationOptions = {}) => {
    if (to === -1) history.back();
    else if (replace || (replaceIfSame && history.location.href === to)) history.replace(to);
    else history.push(to);
  }, [history]);
}
