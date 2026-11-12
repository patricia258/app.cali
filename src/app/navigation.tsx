import { useLocation as useRouterLocation, useParams as useRouterParams, useRouter } from '@tanstack/react-router';
import { useCallback, useLayoutEffect, useMemo, type ComponentPropsWithoutRef } from 'react';

type NavigationOptions = { replace?: boolean };
type LinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { to: string };

export function Link({ to, onClick, target, download, ...props }: LinkProps) {
  const { history } = useRouter();

  return (
    <a
      {...props}
      href={to}
      target={target}
      download={download}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey ||
          (target && target !== '_self') ||
          (download !== undefined && download !== false) ||
          !to.startsWith('/') ||
          to.startsWith('//')
        ) {
          return;
        }

        event.preventDefault();
        if (history.location.href === to) history.replace(to);
        else history.push(to);
      }}
    />
  );
}

export function useNavigate() {
  const { history } = useRouter();

  // Keep complete URLs from existing callers intact, including repeated search keys.
  return useCallback((to: string | -1, { replace }: NavigationOptions = {}) => {
    if (to === -1) history.back();
    else if (replace) history.replace(to);
    else history.push(to);
  }, [history]);
}

export function Navigate({ to, replace }: { to: string } & NavigationOptions) {
  const navigate = useNavigate();
  useLayoutEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return null;
}

export function useLocation() {
  const { history } = useRouter();
  const location = useRouterLocation();
  const raw = history.location;
  const sameEntry = raw.state.__TSR_key === location.state.__TSR_key;
  const pathname = sameEntry ? raw.pathname : location.pathname;
  const search = sameEntry ? raw.search : location.searchStr;
  const fragment = location.href.match(/#.*$/)?.[0] ?? '';
  const hash = sameEntry ? raw.hash : fragment;
  return useMemo(() => ({ pathname, search, hash }), [pathname, search, hash]);
}

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

export function useParams(): Record<string, string | undefined> {
  return useRouterParams({ strict: false });
}
