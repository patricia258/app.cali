let reportToolbarObserverV18: MutationObserver | null = null;

function normalizedLabel(node: Element | null) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function hide(node: HTMLElement | null | undefined, hidden: boolean) {
  if (!node) return;
  if (hidden) {
    node.style.setProperty('display', 'none', 'important');
    node.setAttribute('aria-hidden', 'true');
    if (node instanceof HTMLButtonElement) node.tabIndex = -1;
  } else {
    node.style.removeProperty('display');
    node.removeAttribute('aria-hidden');
    if (node instanceof HTMLButtonElement) node.removeAttribute('tabindex');
  }
}

function syncReportToolbarV18() {
  document.querySelectorAll<HTMLElement>('.reports-v16-toolbar').forEach((toolbar) => {
    const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button'));
    const secondaryView = buttons.find((button) => normalizedLabel(button) === 'Visualizar relatório');
    const primary = buttons.find((button) => button.classList.contains('primary')) || null;
    const primaryLabel = normalizedLabel(primary);
    const samePreview = primaryLabel === 'Ver simulação' || primaryLabel === 'Ver relatório';
    hide(secondaryView, samePreview);

    const isSimulation = primaryLabel === 'Ver simulação';
    const toolbarStatus = toolbar.querySelector<HTMLElement>(':scope > div:first-child > strong');
    hide(toolbarStatus, isSimulation && normalizedLabel(toolbarStatus) === 'Simulação interna');

    // A própria faixa "REVISÃO CALI" já explica o estado da simulação/prévia.
    // O banner de governança repetia a mesma informação logo acima dela.
    const governanceBanner = toolbar.nextElementSibling?.classList.contains('reports-governance-v61')
      ? toolbar.nextElementSibling as HTMLElement
      : document.querySelector<HTMLElement>('.reports-governance-v61');
    hide(governanceBanner, Boolean(governanceBanner));
  });
}

export function installReportToolbarDedupeV18() {
  if (typeof document === 'undefined' || reportToolbarObserverV18) return;
  const start = () => {
    syncReportToolbarV18();
    reportToolbarObserverV18 = new MutationObserver(syncReportToolbarV18);
    reportToolbarObserverV18.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
