/* Decide qual implementação visual está ativa. O cliente usa somente a V2 aprovada; a landing,
   o login, a administradora e o papel de impressão de relatórios seguem com as folhas anteriores
   até serem migrados. As duas nunca ficam no documento ao mesmo tempo. */
type LegacyModule = typeof import('../styles/legacy');
let legacy: Promise<LegacyModule> | null = null;

export function usesClientV2(pathname: string) {
  return (pathname === '/cliente' || pathname.startsWith('/cliente/')) && !pathname.includes('/relatorios/impressao/');
}

export function preloadLegacyStyles() {
  legacy ??= import('../styles/legacy');
  return legacy;
}

export async function applyVisualSystem(pathname: string) {
  const root = document.documentElement;
  if (usesClientV2(pathname)) {
    root.dataset.workspaceUi = 'client-v2';
    if (legacy) (await legacy).unmountLegacyStyles();
    return;
  }
  (await preloadLegacyStyles()).mountLegacyStyles();
  if (!usesClientV2(window.location.pathname)) delete root.dataset.workspaceUi;
}
