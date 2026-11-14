import { applyWorkspaceTheme, resolveWorkspaceTheme } from '../../lib/workspaceTheme';
import { usesV2 } from '../../app/visualRoutes';

function standaloneSurface(pathname: string) {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/') return 'landing';
  if (path === '/login') return 'sign-in';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin-documents';
  return 'public';
}

export function applyVisualSystem(pathname: string) {
  const root = document.documentElement;
  if (usesV2(pathname)) {
    root.dataset.workspaceUi = 'v2';
    delete root.dataset.workspaceSurface;
    applyWorkspaceTheme('day');
    return;
  }
  delete root.dataset.workspaceUi;
  root.dataset.workspaceSurface = standaloneSurface(pathname);
  applyWorkspaceTheme(resolveWorkspaceTheme());
}
