/* Decide qual implementação visual está ativa. O cliente e as páginas já migradas da administradora usam
   somente a V2 aprovada; a landing, o login e as demais páginas da administradora seguem com as
   folhas anteriores até serem migradas. As duas nunca ficam no documento ao mesmo tempo. */
import { applyWorkspaceTheme, resolveWorkspaceTheme } from '../lib/workspaceTheme';
import { usesV2 } from './routes';

export { usesV2 };
type LegacyModule = typeof import('../styles/legacy');
let legacy: Promise<LegacyModule> | null = null;

export function preloadLegacyStyles() {
  legacy ??= import('../styles/legacy');
  return legacy;
}

export async function applyVisualSystem(pathname: string) {
  const root = document.documentElement;
  if (usesV2(pathname)) {
    root.dataset.workspaceUi = 'v2';
    applyWorkspaceTheme('day');
    if (legacy) (await legacy).unmountLegacyStyles();
    return;
  }
  (await preloadLegacyStyles()).mountLegacyStyles();
  if (!usesV2(window.location.pathname)) {
    delete root.dataset.workspaceUi;
    applyWorkspaceTheme(resolveWorkspaceTheme());
  }
}
