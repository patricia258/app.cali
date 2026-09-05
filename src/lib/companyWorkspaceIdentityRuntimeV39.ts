import { backfillWorkspaceLogos, loadCompanyLogoRegistry } from './companyWorkspaceLogo';
import { supabase } from './supabase';

let installed = false;
let observer: MutationObserver | null = null;
let scanTimer = 0;
let registryTimer = 0;
let lastRegistryAt = 0;
let registry = new Map<string, { resolved: string; id: string }>();
let companyChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

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

async function refreshRegistry(force = false) {
  if (document.visibilityState === 'hidden') return;
  if (!force && Date.now() - lastRegistryAt < 2500) return;
  lastRegistryAt = Date.now();
  const loaded = await loadCompanyLogoRegistry();
  registry = loaded.byName;
}

function decorateTile(tile: HTMLElement) {
  if (isReportArea(tile)) return;
  tile.classList.add('workspace-company-logo-tile-v39');
  const image = tile.querySelector<HTMLImageElement>('img');
  if (!image) return;
  const name = companyNameFromImage(image);
  if (!name) return;
  const entry = registry.get(key(name));
  if (!entry?.resolved) {
    image.classList.add('workspace-company-logo-awaiting-v39');
    return;
  }
  if (image.src !== entry.resolved) image.src = entry.resolved;
  image.classList.remove('workspace-company-logo-awaiting-v39');
  image.classList.add('workspace-company-logo-ready-v39');
}

function scan() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(async () => {
    await refreshRegistry();
    document.querySelectorAll<HTMLElement>('.company-logo-slot,.company-logo-editor,[data-company-logo-tile]').forEach(decorateTile);
  }, 70);
}

function watchLogoInputs() {
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'file') return;
    if (!target.closest('.logo-upload-button')) return;
    // The React page uploads the untouched original. The DB trigger invalidates the derived
    // Workspace version and this runtime recreates it automatically after the save.
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
