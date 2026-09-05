import { ensureCompanyWorkspaceLogo, resolveCompanyAsset, type CompanyLogoRecord } from './companyWorkspaceLogo';
import { supabase } from './supabase';

type CompanyRow = CompanyLogoRecord & { status?: string | null };

let installed = false;
let timer = 0;
let busy = false;
let cacheAt = 0;
let companies = new Map<string, CompanyRow>();
let resolved = new Map<string, string>();

function key(value = '') {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function isDocumentsSurface() {
  return location.pathname.startsWith('/admin/documentos') || location.pathname.startsWith('/cliente/documentos');
}

async function loadCompanies(force = false) {
  if (!supabase) return;
  if (!force && companies.size && Date.now() - cacheAt < 10_000) return;
  const result = await supabase
    .from('companies')
    .select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status')
    .order('display_name');
  if (result.error) return;
  companies = new Map();
  resolved = new Map();
  for (const row of (result.data || []) as CompanyRow[]) companies.set(key(row.display_name), row);
  cacheAt = Date.now();
}

async function resolveLogo(company: CompanyRow) {
  const cached = resolved.get(company.id);
  if (cached) return cached;
  let raw = company.logo_workspace_url || '';
  if (!raw && company.logo_url) {
    raw = await ensureCompanyWorkspaceLogo(company);
    if (raw) company.logo_workspace_url = raw;
  }
  if (!raw) return '';
  const url = await resolveCompanyAsset(raw);
  if (url) resolved.set(company.id, url);
  return url;
}

function projectFromCard(card: HTMLElement) {
  const hiddenMeta = card.querySelector<HTMLElement>('.document-client-line-v3 small')?.textContent?.trim() || '';
  if (!hiddenMeta) return '';
  const project = hiddenMeta.split('·')[0]?.trim() || '';
  return /^sem projeto$/i.test(project) ? '' : project;
}

function ensureProjectLegend(card: HTMLElement) {
  const content = card.querySelector<HTMLElement>('.document-card-content-v3');
  const clientLine = card.querySelector<HTMLElement>('.document-client-line-v3');
  if (!content || !clientLine) return;
  const project = projectFromCard(card);
  const existing = card.querySelector<HTMLElement>('.document-project-line-v42');
  if (!project) {
    existing?.remove();
    return;
  }
  const line = existing || document.createElement('div');
  line.className = 'document-project-line-v42';
  line.innerHTML = '<span>PROJETO</span><strong></strong>';
  line.querySelector('strong')!.textContent = project;
  if (!existing) clientLine.insertAdjacentElement('afterend', line);
}

function setClientLogo(tile: HTMLElement, company: CompanyRow, url: string) {
  tile.dataset.companyLogoTile = 'true';
  tile.classList.add('workspace-company-logo-tile-v39', 'document-company-logo-v42');
  if (!url) return;
  const current = tile.querySelector<HTMLImageElement>('img');
  if (current?.src === url && tile.dataset.documentsLogoV42 === url) return;
  tile.dataset.documentsLogoV42 = url;
  tile.replaceChildren();
  const image = document.createElement('img');
  image.src = url;
  image.alt = `Logo ${company.display_name}`;
  image.decoding = 'async';
  image.draggable = false;
  tile.append(image);
}

function ensureAutomaticCover(card: HTMLElement, company: CompanyRow, url: string) {
  const preview = card.querySelector<HTMLElement>('.document-card-preview-v3');
  if (!preview || preview.classList.contains('has-cover') || preview.querySelector(':scope > img')) return;

  let cover = preview.querySelector<HTMLElement>('.document-auto-cover-v42');
  if (!cover) {
    const oldFallback = Array.from(preview.children).find((child) => child instanceof HTMLElement && child.tagName === 'DIV' && !child.classList.contains('document-auto-cover-v42')) as HTMLElement | undefined;
    oldFallback?.remove();
    cover = document.createElement('div');
    cover.className = 'document-auto-cover-v42';
    cover.innerHTML = '<span class="document-auto-cover-brand-v42">CALI</span><div class="document-auto-cover-logo-v42"></div><span class="document-auto-cover-caption-v42">Workspace · Documento</span>';
    preview.prepend(cover);
  }

  const logoBox = cover.querySelector<HTMLElement>('.document-auto-cover-logo-v42');
  if (!logoBox) return;
  logoBox.replaceChildren();
  if (url) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = `Logo ${company.display_name}`;
    image.decoding = 'async';
    image.draggable = false;
    logoBox.append(image);
  } else {
    const fallback = document.createElement('strong');
    fallback.textContent = company.display_name.trim().slice(0, 1).toUpperCase() || 'C';
    logoBox.append(fallback);
  }
}

async function decorateCard(card: HTMLElement) {
  const companyName = card.querySelector<HTMLElement>('.document-client-line-v3 strong')?.textContent?.trim() || '';
  if (!companyName) return;
  const company = companies.get(key(companyName));
  if (!company) return;
  const url = await resolveLogo(company);
  const tile = card.querySelector<HTMLElement>('.document-client-logo-v3');
  if (tile) setClientLogo(tile, company, url);
  ensureProjectLegend(card);
  ensureAutomaticCover(card, company, url);
}

async function scan(force = false) {
  if (busy || !isDocumentsSurface()) return;
  busy = true;
  try {
    await loadCompanies(force);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.document-library-card-v3'));
    await Promise.all(cards.map(decorateCard));
  } finally {
    busy = false;
  }
}

function schedule(force = false) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void scan(force), 70);
}

export function installDocumentsIdentityRuntimeV42() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  schedule(true);
  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      if (target?.closest('.document-library-grid-v3,.document-library-card-v3')) return true;
      return Array.from(mutation.addedNodes).some((node) => node instanceof Element && (node.matches('.document-library-card-v3,.document-library-grid-v3') || Boolean(node.querySelector?.('.document-library-card-v3'))));
    });
    if (relevant) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => schedule(true));
  window.addEventListener('popstate', () => schedule(true));
}
