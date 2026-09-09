import { installSchedulingPostConfirmationV69, refreshSchedulingPostConfirmationV69 } from './schedulingPostConfirmationV69';
import { installSchedulingMeetingContextV70, refreshSchedulingMeetingContextV70 } from './schedulingMeetingContextV70';
import { refreshSchedulingReportAgendaV71 } from './schedulingReportAgendaV71';

let installed = false;
let policiesLoaded = false;
let loadingPolicies = false;
let historyPatched = false;
const policyPopstateListeners: Array<EventListenerOrEventListenerObject> = [];

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

function capturePolicyPopstateListener(listener: EventListenerOrEventListenerObject | null) {
  if (!listener) return;
  if (!policyPopstateListeners.includes(listener)) policyPopstateListeners.push(listener);
}

async function loadPoliciesWithoutObservers() {
  if (policiesLoaded || loadingPolicies) return;
  loadingPolicies = true;
  const NativeMutationObserver = window.MutationObserver;
  const nativeAddEventListener = window.addEventListener.bind(window);
  try {
    // V66/V67 ainda possuem listeners/observers legados internamente. Durante a carga,
    // neutralizamos somente o observer de DOM e capturamos apenas o popstate dessas duas
    // camadas. Assim elas continuam com seus eventos de click/change/submit, mas não
    // passam a escutar a navegação global do Workspace.
    (window as any).MutationObserver = SilentMutationObserver;
    (window as any).addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      if (type === 'popstate') {
        capturePolicyPopstateListener(listener);
        return;
      }
      nativeAddEventListener(type, listener as EventListenerOrEventListenerObject, options);
    }) as typeof window.addEventListener;

    await import('./schedulingPolicyRuntimeV66');
    await import('./schedulingPolicyUXV67');
    policiesLoaded = true;
  } finally {
    (window as any).MutationObserver = NativeMutationObserver;
    (window as any).addEventListener = nativeAddEventListener;
    loadingPolicies = false;
  }
}

function notifyCapturedPolicyRuntimes() {
  if (!policiesLoaded || !policyPopstateListeners.length) return;
  const event = new PopStateEvent('popstate', { state: history.state });
  for (const listener of policyPopstateListeners) {
    try {
      if (typeof listener === 'function') listener.call(window, event);
      else listener.handleEvent(event);
    } catch (error) {
      console.error('Agenda · falha ao atualizar política isolada', error);
    }
  }
}

function refreshSchedulingLayers() {
  notifyCapturedPolicyRuntimes();
  window.setTimeout(() => {
    void refreshSchedulingPostConfirmationV69();
    void refreshSchedulingMeetingContextV70();
    void refreshSchedulingReportAgendaV71();
  }, 180);
}

function onRouteSettled() {
  if (!isSchedulingRoute()) return;
  if (!policiesLoaded) {
    window.setTimeout(() => {
      void loadPoliciesWithoutObservers().then(() => {
        window.setTimeout(refreshSchedulingLayers, 180);
      });
    }, 180);
    return;
  }
  window.setTimeout(refreshSchedulingLayers, 90);
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

function stabilizeClientSchedulingChange(event: Event) {
  if (!policiesLoaded) return;
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target || !target.closest('#scheduling-client-form')) return;
  if (!['mode', 'date1'].includes(target.name)) return;

  // V65 e V66 escreviam a mesma área de política em sequência. O usuário via o
  // texto intermediário do V65 por alguns milissegundos e depois a política
  // canônica do V66, produzindo a piscada. Mantemos V65 apenas para fallback;
  // quando V66/V67 já estão ativos, eles passam a ser a única fonte visual da política.
  if (target.name === 'mode') {
    const form = target.closest<HTMLFormElement>('#scheduling-client-form');
    if (form) {
      const mode = form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value || 'remote';
      const locationField = form.querySelector<HTMLElement>('[data-scheduling-location-field]');
      if (locationField) locationField.hidden = mode !== 'in_person';
      const slot2Label = form.querySelector<HTMLElement>('[data-scheduling-slot2-label]');
      if (slot2Label) slot2Label.textContent = mode === 'in_person' ? '(obrigatória)' : '(opcional no virtual)';
      const date2 = form.elements.namedItem('date2') as HTMLInputElement | null;
      const time2 = form.elements.namedItem('time2') as HTMLInputElement | null;
      if (date2) date2.required = mode === 'in_person';
      if (time2) time2.required = mode === 'in_person';
    }
  }

  // Não impede os listeners do próprio window (V66/V67), apenas evita que o
  // change continue até o listener legado do V65 no document.
  event.stopPropagation();
}

export function installSchedulingPolicyLoaderV68() {
  if (installed) return;
  installed = true;
  installSchedulingPostConfirmationV69();
  installSchedulingMeetingContextV70();
  patchHistory();

  window.addEventListener('change', stabilizeClientSchedulingChange, true);

  // Somente popstate REAL do navegador chega aqui. Nunca disparamos popstate sintético
  // no window, porque isso acordava runtimes de outros módulos e fazia a tela inteira
  // piscar. V66/V67 são atualizados de forma privada por notifyCapturedPolicyRuntimes().
  window.addEventListener('popstate', () => {
    window.setTimeout(onRouteSettled, 0);
  });
  window.setTimeout(onRouteSettled, 220);
}
