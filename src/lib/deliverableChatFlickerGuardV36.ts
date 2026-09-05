let installed = false;
const snapshots = new WeakMap<HTMLElement, string>();
const observers = new WeakMap<HTMLElement, MutationObserver>();

function isClientDeliverables() {
  return location.pathname.startsWith('/cliente/entregaveis');
}

function remember(list: HTMLElement) {
  if (!list.querySelector('.workspace-chat-line')) return;
  snapshots.set(list, list.innerHTML);
}

function restoreIfNativeFlash(list: HTMLElement) {
  if (!document.body.contains(list)) return;
  const hasStandard = Boolean(list.querySelector('.workspace-chat-line,.workspace-chat-empty'));
  const hasNative = Boolean(list.querySelector(':scope > article,.empty-inline-v2'));
  if (hasStandard) {
    list.classList.remove('workspace-chat-refreshing-v36');
    remember(list);
    return;
  }
  if (!hasNative) return;

  const snapshot = snapshots.get(list);
  if (snapshot) {
    list.classList.add('workspace-chat-refreshing-v36');
    // React pode redesenhar por alguns instantes após o INSERT. Mantemos a última
    // conversa estável até o runtime compartilhado receber o novo estado real.
    list.innerHTML = snapshot;
    window.setTimeout(() => list.classList.remove('workspace-chat-refreshing-v36'), 900);
  } else {
    list.classList.add('workspace-chat-native-hidden-v36');
  }
}

function bind(list: HTMLElement) {
  if (observers.has(list)) return;
  remember(list);
  const observer = new MutationObserver(() => restoreIfNativeFlash(list));
  observer.observe(list, { childList: true, subtree: false });
  observers.set(list, observer);

  const pane = list.closest('.conversation-pane-v2');
  const compose = pane?.querySelector<HTMLElement>('.conversation-composer-v2');
  if (compose) {
    const beforeSend = (event: Event) => {
      if (event.type === 'keydown') {
        const keyboard = event as KeyboardEvent;
        if (keyboard.key !== 'Enter' || keyboard.shiftKey) return;
      }
      remember(list);
      list.classList.add('workspace-chat-refreshing-v36');
    };
    compose.addEventListener('click', beforeSend, true);
    compose.addEventListener('keydown', beforeSend, true);
  }
}

function scan() {
  if (!isClientDeliverables()) return;
  document.querySelectorAll<HTMLElement>('.client-conversation-list-v33').forEach(bind);
}

export function installDeliverableChatFlickerGuardV36() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}
