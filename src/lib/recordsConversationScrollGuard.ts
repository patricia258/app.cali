let installed = false;

type HistoryState = {
  manualHistory: boolean;
  userInputUntil: number;
  lastUserScrollTop: number;
  allowBottomUntil: number;
  restoring: boolean;
};

const states = new WeakMap<HTMLElement, HistoryState>();

function scrollTopDescriptor() {
  let proto: any = HTMLElement.prototype;
  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
    if (descriptor?.get && descriptor?.set) return descriptor;
    proto = Object.getPrototypeOf(proto);
  }
  return null;
}

const nativeScrollTop = scrollTopDescriptor();

function nativeGet(element: HTMLElement) {
  return nativeScrollTop?.get ? Number(nativeScrollTop.get.call(element) || 0) : element.scrollTop;
}

function nativeSet(element: HTMLElement, value: number) {
  if (nativeScrollTop?.set) nativeScrollTop.set.call(element, value);
  else element.scrollTop = value;
}

function distanceFromBottom(element: HTMLElement) {
  return Math.max(0, element.scrollHeight - element.clientHeight - nativeGet(element));
}

function restoreHistoryPosition(history: HTMLElement, state: HistoryState) {
  if (!state.manualHistory || state.restoring) return;
  state.restoring = true;
  const restore = () => {
    if (document.body.contains(history) && state.manualHistory) {
      nativeSet(history, Math.min(state.lastUserScrollTop, Math.max(0, history.scrollHeight - history.clientHeight)));
    }
  };
  window.requestAnimationFrame(restore);
  window.setTimeout(() => {
    restore();
    state.restoring = false;
  }, 220);
}

function guardHistory(history: HTMLElement) {
  if (states.has(history)) return;

  const state: HistoryState = {
    manualHistory: false,
    userInputUntil: 0,
    lastUserScrollTop: nativeGet(history),
    allowBottomUntil: performance.now() + 1200,
    restoring: false,
  };
  states.set(history, state);

  if (nativeScrollTop) {
    Object.defineProperty(history, 'scrollTop', {
      configurable: true,
      get() {
        return nativeGet(history);
      },
      set(value: number) {
        const next = Number(value || 0);
        const bottom = Math.max(0, history.scrollHeight - history.clientHeight);
        const tryingToForceLatest = next >= Math.max(0, bottom - 8);
        const blockAutoPin = state.manualHistory && performance.now() > state.allowBottomUntil && tryingToForceLatest;
        if (blockAutoPin) return;
        nativeSet(history, next);
      },
    });
  }

  history.addEventListener('wheel', (event) => {
    state.userInputUntil = performance.now() + 650;
    if (event.deltaY < 0) {
      state.manualHistory = true;
      state.lastUserScrollTop = nativeGet(history);
    }
  }, { passive: true });

  history.addEventListener('touchstart', () => {
    state.manualHistory = true;
    state.userInputUntil = performance.now() + 1200;
    state.lastUserScrollTop = nativeGet(history);
  }, { passive: true });

  history.addEventListener('pointerdown', (event) => {
    const rect = history.getBoundingClientRect();
    if (event.clientX >= rect.right - 22) {
      state.manualHistory = true;
      state.userInputUntil = performance.now() + 2400;
      state.lastUserScrollTop = nativeGet(history);
    }
  }, { passive: true });

  history.addEventListener('scroll', () => {
    const now = performance.now();
    const distance = distanceFromBottom(history);
    if (distance <= 36) {
      state.manualHistory = false;
      state.lastUserScrollTop = nativeGet(history);
      return;
    }
    if (now <= state.userInputUntil) {
      state.manualHistory = true;
      state.lastUserScrollTop = nativeGet(history);
    }
  }, { passive: true });

  const drawer = history.closest('.records-v13-drawer');
  const compose = drawer?.querySelector<HTMLElement>('.conversation-compose');
  if (compose) {
    const releaseForOwnMessage = (event: Event) => {
      if (event.type === 'keydown') {
        const keyboard = event as KeyboardEvent;
        if (keyboard.key !== 'Enter' || keyboard.shiftKey) return;
      }
      state.manualHistory = false;
      state.allowBottomUntil = performance.now() + 1600;
    };
    compose.addEventListener('click', releaseForOwnMessage, true);
    compose.addEventListener('keydown', releaseForOwnMessage, true);
  }

  const messageObserver = new MutationObserver((mutations) => {
    if (!state.manualHistory) return;
    if (!mutations.some((mutation) => mutation.type === 'childList')) return;
    restoreHistoryPosition(history, state);
  });
  messageObserver.observe(history, { childList: true, subtree: false });
}

function scan() {
  document.querySelectorAll<HTMLElement>('.records-v13-drawer .conversation-history').forEach(guardHistory);
}

export function installRecordsConversationScrollGuard() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}
