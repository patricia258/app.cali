import { useLayoutEffect } from 'react';
import { useNavigate, type NavigationOptions } from '../../hooks/useNavigate';

export function Navigate({ to, replace }: { to: string } & NavigationOptions) {
  const navigate = useNavigate();
  useLayoutEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return null;
}
