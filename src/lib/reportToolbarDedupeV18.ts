let reportToolbarObserverV18: MutationObserver | null = null;

function normalizedLabel(node: Element | null) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function syncReportToolbarV18() {
  document.querySelectorAll<HTMLElement>('.reports-v16-toolbar').forEach((toolbar) => {
    const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button'));
    const secondaryView = buttons.find((button) => normalizedLabel(button) === 'Visualizar relatório');
    if (!secondaryView) return;

    const primary = buttons.find((button) => button.classList.contains('primary')) || null;
    const primaryLabel = normalizedLabel(primary);
    const primaryAlreadyOpensSamePreview = primaryLabel === 'Ver simulação' || primaryLabel === 'Ver relatório';

    secondaryView.hidden = primaryAlreadyOpensSamePreview;
    secondaryView.setAttribute('aria-hidden', primaryAlreadyOpensSamePreview ? 'true' : 'false');
    if (primaryAlreadyOpensSamePreview) secondaryView.tabIndex = -1;
    else secondaryView.removeAttribute('tabindex');
  });
}

export function installReportToolbarDedupeV18() {
  if (typeof document === 'undefined' || reportToolbarObserverV18) return;

  const start = () => {
    syncReportToolbarV18();
    reportToolbarObserverV18 = new MutationObserver(() => syncReportToolbarV18());
    reportToolbarObserverV18.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
