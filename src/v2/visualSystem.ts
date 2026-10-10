/* Decide qual implementação visual está ativa. O cliente usa somente a V2 aprovada; a landing,
   o login, a administradora e o papel de impressão de relatórios seguem com as folhas anteriores
   até serem migrados. As duas nunca ficam no documento ao mesmo tempo. */
import { applyWorkspaceTheme, resolveWorkspaceTheme } from '../lib/workspaceTheme';
import { usesClientV2 } from './routes';

export { usesClientV2 };
type LegacyModule = typeof import('../styles/legacy');
let legacy: Promise<LegacyModule> | null = null;

export function preloadLegacyStyles() {
  legacy ??= import('../styles/legacy');
  return legacy;
}

export async function applyVisualSystem(pathname: string) {
  const root = document.documentElement;
  if (usesClientV2(pathname)) {
    root.dataset.workspaceUi = 'v2';
    applyWorkspaceTheme('day');
    if (legacy) (await legacy).unmountLegacyStyles();
    return;
  }
  (await preloadLegacyStyles()).mountLegacyStyles();
  if (!usesClientV2(window.location.pathname)) {
    delete root.dataset.workspaceUi;
    applyWorkspaceTheme(resolveWorkspaceTheme());
  }
}
