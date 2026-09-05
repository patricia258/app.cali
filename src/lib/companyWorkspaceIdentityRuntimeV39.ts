import { backfillWorkspaceLogos, loadCompanyLogoRegistry } from './companyWorkspaceLogo';
import { installHoursCompanyLogoRuntimeV41 } from './hoursCompanyLogoRuntimeV41';
import { supabase } from './supabase';

let installed = false;
let observer: MutationObserver | null = null;
let scanTimer = 0;
let registryTimer = 0;
let lastRegistryAt = 0;
let registry = new Map<string, { resolved: string; id: string }>();
let companyChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

const COMPANY_TILE_SELECTORS = [
  '.company-logo-slot',
  '.company-logo-editor',
  '[data-company-logo-tile]',
  '.hours-v13-logo',
  '.calendar-detail-company-mark',
  '.global-timer-logo',
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

function companyNameFromContext(tile: HTMLElement) {
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

async function refreshRegistry(force = false) {
  if (document.visibilityState === 'hidden') return;
  if (!force && Date.now() - lastRegistryAt < 2500) return;
  lastRegistryAt = Date.now();
  const loaded = await loadCompanyLogoRegistry();
  registry = loaded.byName;
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

function decorateTile(tile: HTMLElement) {
  if (isReportArea(tile)) return;
  tile.classList.add('workspace-company-logo-tile-v39');
  const name = companyNameFromContext(tile);
  if (!name) return;
  const entry = registry.get(key(name));
  const image = tile.querySelector<HTMLImageElement>('img');
  if (!entry?.resolved) {
    image?.classList.add('workspace-company-logo-awaiting-v39');
    return;
  }
  applyResolvedTile(tile, entry.resolved);
}

function scan() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(async () => {
    await refreshRegistry();
    document.querySelectorAll<HTMLElement>(COMPANY_TILE_SELECTORS).forEach(decorateTile);
  }, 70);
}

function watchLogoInputs() {
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'file') return;
    if (!target.closest('.logo-upload-button')) return;
    window.setTimeout(() => void backfillWorkspaceLogos(2), 2500);
    window.setTimeout(() => void backfillWorkspaceLogos(2), 7000);
  }, true);
}

async function startCompanyRealtime() {
  if (!supabase || companyChannel) return;
  companyChannel = supabase.channel('company-workspace-identity-v39')
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'companies' }, () => {
      lastRegistryAt = 0;
      window.clearTimeout(registryTimer);
      registryTimer = window.setTimeout(async () => {
        await backfillWorkspaceLogos(2);
        await refreshRegistry(true);
        scan();
      }, 700);
    })
    .subscribe();
}

export function installCompanyWorkspaceIdentityRuntimeV39() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  installHoursCompanyLogoRuntimeV41();
  watchLogoInputs();
  void startCompanyRealtime();
  void backfillWorkspaceLogos(3).then(() => refreshRegistry(true)).then(scan);
  observer = new MutationObserver((mutations) => {
    if (mutations.every((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest('.workspace-company-logo-tile-v39'));
    })) return;
    scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => {
    lastRegistryAt = 0;
    void backfillWorkspaceLogos(2).then(() => refreshRegistry(true)).then(scan);
  });
  scan();
}
