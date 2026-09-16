let activePath = typeof window === 'undefined' ? '' : window.location.pathname;

export function activateRoute(pathname: string) {
  activePath = pathname;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cali-route-change', { detail: { pathname } }));
  }
}

export function isRouteActive(predicate: (pathname: string) => boolean) {
  const pathname = typeof window === 'undefined' ? activePath : window.location.pathname;
  return activePath === pathname && predicate(pathname);
}

export function isWorkspaceRoute(...prefixes: string[]) {
  return isRouteActive((pathname) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)));
}
