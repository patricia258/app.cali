import { useInsertionEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';

const focusableSelector = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary', '[tabindex]', '[contenteditable="true"]',
].join(',');

function isAvailable(element: HTMLElement, dialog: HTMLElement) {
  return (
    element.closest('[aria-modal="true"]') === dialog
    && !element.matches(':disabled')
    && !element.closest('[inert], [hidden], [aria-hidden="true"]')
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility === 'visible'
  );
}

function focusableChildren(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => element.tabIndex >= 0 && isAvailable(element, dialog));
}

export function useDialogFocus() {
  const ref = useRef<HTMLElement | null>(null);

  // React applies autoFocus in the layout phase, after this capture.
  useInsertionEffect(() => {
    const previous = document.activeElement;
    return () => {
      const dialog = ref.current;
      if (!dialog || !(previous instanceof HTMLElement) || dialog.contains(previous)) return;
      const focused = document.activeElement;
      if (focused === document.body || dialog.contains(focused)) {
        queueMicrotask(() => {
          if (previous.isConnected && document.activeElement === document.body) previous.focus({ preventScroll: true });
        });
      }
    };
  }, []);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const dialog = ref.current;
    if (!dialog || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest('[aria-modal="true"]') !== dialog) return;
    if (event.key === 'Escape') {
      const close = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button[data-dialog-close], button[aria-label="Fechar"]'))
        .find((button) => isAvailable(button, dialog));
      if (close) {
        event.preventDefault();
        event.stopPropagation();
        close.click();
      }
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = focusableChildren(dialog);
    const first = focusable[0];
    const last = focusable.at(-1);
    const current = document.activeElement;
    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
    } else if (!focusable.some((element) => element === current) || (event.shiftKey ? current === first : current === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  return { ref, handleKeyDown };
}
