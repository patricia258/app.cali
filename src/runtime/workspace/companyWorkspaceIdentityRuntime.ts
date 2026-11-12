import { backfillWorkspaceLogos, loadCompanyLogoRegistry } from '../../lib/companyWorkspaceLogo';
import { observeCompanyIdentityChanges } from '../../api/workspace/identity';

type CompanyRegistry = Map<string, { resolved: string; id: string }>;

const COMPANY_TILE_SELECTORS = [
  '.company-logo-slot',
  '.company-logo-editor',
  '[data-company-logo-tile]',
  '.hours-v13-logo',
  '.calendar-detail-company-mark',
  '.deadline-logo-v2',
  '.project-client-mark',
  '.company-mark',
  '.company-logo',
  '.bar-client-logo',
  '.client-logo',
  '.client-mark',
  '.account-company-logo',
  '.people-map-company-mark',
  '.people-map-company-avatar',
  '.project-client-logo-v39',
].join(',');

function key(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function isReportArea(element: Element) {
  if (location.pathname.includes('/relatorios') || location.pathname.includes('/reports')) return true;
  return Boolean(element.closest('.report-page,.report-preview,.report-document,.pdf-page,[data-document-surface="report"]'));
}

function companyNameFromImage(image: HTMLImageElement) {
  const alt = image.alt.trim();
  const match = alt.match(/^logo\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  const container = image.closest('.client-identity,.account-client-brand,.client-card,.company-card');
  return container?.querySelector<HTMLElement>('strong,h2,h3')?.textContent?.trim() || '';
}

function companyNameFromContext(tile: HTMLElement, registry: CompanyRegistry) {
  const image = tile.querySelector<HTMLImageElement>('img');
  const imageName = image ? companyNameFromImage(image) : '';
  if (imageName) return imageName;

  const hoursRow = tile.closest('.hours-v13-usage-list > article,.hours-v13-timer-row');
  const hoursName = hoursRow?.querySelector<HTMLElement>('.hours-v13-usage-name strong,.hours-v13-timer-context > span')?.textContent?.trim();
  if (hoursName) return hoursName;

  const calendarHeading = tile.closest('.calendar-detail-heading');
  const calendarMeta = calendarHeading?.querySelector<HTMLElement>('p')?.textContent?.trim() || '';
  if (calendarMeta) return calendarMeta.split('·')[0]?.trim() || '';

  const projectButton = tile.closest('.project-selector-v2 > button,.project-client-card-v39,.project-client-modal-identity-v39');
  const projectName = projectButton?.querySelector<HTMLElement>('strong,h2')?.textContent?.trim();
  if (projectName && registry.has(key(projectName))) return projectName;

  let current: HTMLElement | null = tile.parentElement;
  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const text = current.textContent?.trim() || '';
    if (!text) continue;
    const match = Array.from(registry.keys())
      .sort((a, b) => b.length - a.length)
      .find((name) => key(text).includes(name));
    if (match) return match;
  }
  return '';
}

function applyResolvedTile(tile: HTMLElement, resolved: string) {
  tile.classList.add('workspace-company-logo-tile-v39');
  tile.dataset.companyLogoResolved = 'true';
  tile.style.setProperty('--workspace-company-logo-image', `url("${resolved.replace(/"/g, '\\"')}")`);

  const image = tile.querySelector<HTMLImageElement>('img');
  if (image) {
    if (image.src !== resolved) image.src = resolved;
    image.classList.remove('workspace-company-logo-awaiting-v39');
    image.classList.add('workspace-company-logo-ready-v39');
    tile.style.removeProperty('background-image');
    return;
  }

  tile.style.backgroundImage = `url("${resolved.replace(/"/g, '\\"')}")`;
  tile.style.backgroundPosition = 'center';
  tile.style.backgroundRepeat = 'no-repeat';
  tile.style.backgroundSize = 'cover';
  tile.style.color = 'transparent';
  tile.style.textShadow = 'none';
}

function decorateTile(tile: HTMLElement, registry: CompanyRegistry) {
  if (isReportArea(tile)) return;
  tile.classList.add('workspace-company-logo-tile-v39');
  const name = companyNameFromContext(tile, registry);
  if (!name) return;
  const entry = registry.get(key(name));
  const image = tile.querySelector<HTMLImageElement>('img');
  if (!entry?.resolved) {
    image?.classList.add('workspace-company-logo-awaiting-v39');
    return;
  }
  applyResolvedTile(tile, entry.resolved);
}

export function installCompanyWorkspaceIdentityRuntime(signal: AbortSignal) {
  if (signal.aborted) return;
  const uploadTimers = new Set<number>();
  let scanTimer = 0;
  let registryTimer = 0;
  let lastRegistryAt = 0;
  let registry: CompanyRegistry = new Map();

  async function refreshRegistry(force = false) {
    if (signal.aborted || document.visibilityState === 'hidden') return;
    if (!force && Date.now() - lastRegistryAt < 2500) return;
    lastRegistryAt = Date.now();
    const loaded = await loadCompanyLogoRegistry(signal);
    if (!signal.aborted) registry = loaded.byName;
  }

  function scan() {
    if (signal.aborted) return;
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(async () => {
      await refreshRegistry();
      if (!signal.aborted) document.querySelectorAll<HTMLElement>(COMPANY_TILE_SELECTORS)
        .forEach((tile) => decorateTile(tile, registry));
    }, 70);
  }

  async function update(limit: number) {
    await backfillWorkspaceLogos(limit, signal);
    await refreshRegistry(true);
    scan();
  }

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'file' || !target.closest('.logo-upload-button')) return;
    for (const delay of [2500, 7000]) {
      const timer = window.setTimeout(() => {
        uploadTimers.delete(timer);
        void backfillWorkspaceLogos(2, signal);
      }, delay);
      uploadTimers.add(timer);
    }
  }, { capture: true, signal });

  const stopCompanyUpdates = observeCompanyIdentityChanges(() => {
    if (signal.aborted) return;
    lastRegistryAt = 0;
    window.clearTimeout(registryTimer);
    registryTimer = window.setTimeout(() => void update(2), 700);
  });
  void update(3);
  const observer = new MutationObserver((mutations) => {
    if (mutations.every((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest('.workspace-company-logo-tile-v39'));
    })) return;
    scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => {
    lastRegistryAt = 0;
    void update(2);
  }, { signal });
  signal.addEventListener('abort', () => {
    observer.disconnect();
    window.clearTimeout(scanTimer);
    window.clearTimeout(registryTimer);
    for (const timer of uploadTimers) window.clearTimeout(timer);
    uploadTimers.clear();
    registry.clear();
    stopCompanyUpdates();
  }, { once: true });
  scan();
}
