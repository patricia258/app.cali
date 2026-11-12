import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';

const focusableSelector = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary', '[tabindex]', '[contenteditable="true"]',
].join(',');

function focusableChildren(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
    element.tabIndex >= 0
    && !element.matches(':disabled')
    && !element.closest('[inert], [hidden], [aria-hidden="true"]')
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility === 'visible'
  ));
}

export function useDialogFocus() {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    if (!dialog.contains(previous)) dialog.focus({ preventScroll: true });

    return () => {
      if (!(previous instanceof HTMLElement) || dialog.contains(previous)) return;
      const focused = document.activeElement;
      if (focused === document.body || dialog.contains(focused)) {
        if (previous.isConnected) previous.focus({ preventScroll: true });
      }
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const dialog = ref.current;
    if (!dialog || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest('[aria-modal="true"]') !== dialog) return;
    if (event.key === 'Escape') {
      const close = dialog.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]:not(:disabled)');
      if (close && close.getClientRects().length > 0) {
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
