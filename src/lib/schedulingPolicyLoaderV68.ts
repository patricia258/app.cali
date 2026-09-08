import { installSchedulingPostConfirmationV69, refreshSchedulingPostConfirmationV69 } from './schedulingPostConfirmationV69';
import { installSchedulingMeetingContextV70, refreshSchedulingMeetingContextV70 } from './schedulingMeetingContextV70';

let installed = false;
let policiesLoaded = false;
let loadingPolicies = false;
let historyPatched = false;
let internalPolicyRefresh = false;

class SilentMutationObserver implements MutationObserver {
  readonly root: MutationObserver | null = null;
  constructor(_callback: MutationCallback) {}
  disconnect() {}
  observe(_target: Node, _options?: MutationObserverInit) {}
  takeRecords(): MutationRecord[] { return []; }
}

function isSchedulingRoute(pathname = window.location.pathname) {
  return pathname === '/cliente/cronograma' || pathname === '/admin/calendario' || pathname.includes('/relatorios');
}

async function loadPoliciesWithoutObservers() {
  if (policiesLoaded || loadingPolicies) return;
  loadingPolicies = true;
  const NativeMutationObserver = window.MutationObserver;
  try {
    // V66/V67 são camadas de enriquecimento. Elas não devem observar o DOM inteiro:
    // o React/V65 já controlam a renderização base e o observer antigo criava ciclos de
    // remove/insere que faziam os cards e a página inteira piscarem.
    (window as any).MutationObserver = SilentMutationObserver;
    await import('./schedulingPolicyRuntimeV66');
    await import('./schedulingPolicyUXV67');
    policiesLoaded = true;
  } finally {
    (window as any).MutationObserver = NativeMutationObserver;
    loadingPolicies = false;
  }
}

function notifyPolicyRuntimes() {
  if (!policiesLoaded || internalPolicyRefresh) return;

  // V66/V67 usam popstate como sinal de reaplicação. Este evento é interno e não pode
  // acionar novamente o próprio loader, senão cria um ciclo infinito de re-render.
  internalPolicyRefresh = true;
  try {
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  } finally {
    internalPolicyRefresh = false;
  }

  window.setTimeout(() => {
    void refreshSchedulingPostConfirmationV69();
    void refreshSchedulingMeetingContextV70();
  }, 180);
}

function onRouteSettled() {
  if (!isSchedulingRoute()) return;
  if (!policiesLoaded) {
    window.setTimeout(() => {
      void loadPoliciesWithoutObservers().then(() => window.setTimeout(() => {
        void refreshSchedulingPostConfirmationV69();
        void refreshSchedulingMeetingContextV70();
      }, 180));
    }, 180);
    return;
  }
  window.setTimeout(notifyPolicyRuntimes, 90);
}

function patchHistory() {
  if (historyPatched) return;
  historyPatched = true;
  const rawPush = history.pushState.bind(history);
  const rawReplace = history.replaceState.bind(history);

  history.pushState = ((...args: Parameters<History['pushState']>) => {
    const before = window.location.pathname;
    const result = rawPush(...args);
    if (window.location.pathname !== before) window.setTimeout(onRouteSettled, 0);
    return result;
  }) as History['pushState'];

  history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    const before = window.location.pathname;
    const result = rawReplace(...args);
    if (window.location.pathname !== before) window.setTimeout(onRouteSettled, 0);
    return result;
  }) as History['replaceState'];
}

export function installSchedulingPolicyLoaderV68() {
  if (installed) return;
  installed = true;
  installSchedulingPostConfirmationV69();
  installSchedulingMeetingContextV70();
  patchHistory();
  window.addEventListener('popstate', () => {
    if (internalPolicyRefresh) return;
    window.setTimeout(onRouteSettled, 0);
  });
  window.setTimeout(onRouteSettled, 220);
}
