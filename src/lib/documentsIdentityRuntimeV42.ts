import { ensureCompanyWorkspaceLogo, resolveCompanyAsset, type CompanyLogoRecord } from './companyWorkspaceLogo';
import { supabase } from './supabase';

type CompanyRow = CompanyLogoRecord & { status?: string | null };
type BrandVisual = { color: string; dark: boolean };

let installed = false;
let timer = 0;
let busy = false;
let cacheAt = 0;
let companies = new Map<string, CompanyRow>();
let resolvedWorkspace = new Map<string, string>();
let resolvedOriginal = new Map<string, string>();
let brandVisuals = new Map<string, BrandVisual>();

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
  resolvedWorkspace = new Map();
  resolvedOriginal = new Map();
  brandVisuals = new Map();
  for (const row of (result.data || []) as CompanyRow[]) companies.set(key(row.display_name), row);
  cacheAt = Date.now();
}

async function resolveWorkspaceLogo(company: CompanyRow) {
  const cached = resolvedWorkspace.get(company.id);
  if (cached) return cached;
  let raw = company.logo_workspace_url || '';
  if (!raw && company.logo_url) {
    raw = await ensureCompanyWorkspaceLogo(company);
    if (raw) company.logo_workspace_url = raw;
  }
  if (!raw) return '';
  const url = await resolveCompanyAsset(raw);
  if (url) resolvedWorkspace.set(company.id, url);
  return url;
}

async function resolveOriginalLogo(company: CompanyRow) {
  const cached = resolvedOriginal.get(company.id);
  if (cached) return cached;
  if (!company.logo_url) return '';
  const url = await resolveCompanyAsset(company.logo_url, 1800);
  if (url) resolvedOriginal.set(company.id, url);
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

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}
function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function cssRgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

async function imageFromUrl(url: string) {
  const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!response.ok) throw new Error('logo unavailable');
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('logo decode failed'));
      image.src = objectUrl;
    });
    return image;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

async function resolveBrandVisual(company: CompanyRow, originalUrl: string): Promise<BrandVisual> {
  const cached = brandVisuals.get(company.id);
  if (cached) return cached;
  const fallback: BrandVisual = { color: '#F7F3EE', dark: false };
  if (!originalUrl) {
    brandVisuals.set(company.id, fallback);
    return fallback;
  }
  try {
    const image = await imageFromUrl(originalUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 56; canvas.height = 56;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.clearRect(0, 0, 56, 56);
    ctx.drawImage(image, 0, 0, 56, 56);
    const pixels = ctx.getImageData(0, 0, 56, 56);
    const samples: Array<[number, number, number, number]> = [];
    const edge = 7;
    for (let y = 0; y < 56; y += 1) {
      for (let x = 0; x < 56; x += 1) {
        if (!(x < edge || x >= 56 - edge || y < edge || y >= 56 - edge)) continue;
        const i = (y * 56 + x) * 4;
        const a = pixels.data[i + 3];
        if (a > 80) samples.push([pixels.data[i], pixels.data[i + 1], pixels.data[i + 2], a]);
      }
    }
    if (samples.length > 90) {
      const avg = samples.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [0, 0, 0]);
      const r = avg[0] / samples.length, g = avg[1] / samples.length, b = avg[2] / samples.length;
      const spread = samples.reduce((sum, p) => sum + Math.hypot(p[0] - r, p[1] - g, p[2] - b), 0) / samples.length;
      const sat = saturation(r, g, b), lum = luminance(r, g, b);
      if (spread < 42 && sat > 0.13 && lum > 0.055 && lum < 0.94) {
        const visual = { color: cssRgb(r, g, b), dark: lum < 0.48 };
        brandVisuals.set(company.id, visual);
        return visual;
      }
    }
  } catch (error) {
    console.warn('CALI document cover brand color', company.display_name, error);
  }
  brandVisuals.set(company.id, fallback);
  return fallback;
}

async function ensureAutomaticCover(card: HTMLElement, company: CompanyRow, originalUrl: string, workspaceUrl: string) {
  const preview = card.querySelector<HTMLElement>('.document-card-preview-v3');
  if (!preview || preview.classList.contains('has-cover') || preview.querySelector(':scope > img')) return;

  let cover = preview.querySelector<HTMLElement>('.document-auto-cover-v42');
  if (!cover) {
    const oldFallback = Array.from(preview.children).find((child) => child instanceof HTMLElement && child.tagName === 'DIV' && !child.classList.contains('document-auto-cover-v42')) as HTMLElement | undefined;
    oldFallback?.remove();
    cover = document.createElement('div');
    cover.className = 'document-auto-cover-v42';
    preview.prepend(cover);
  }

  cover.classList.add('document-brand-cover-v45');
  cover.innerHTML = '<div class="document-auto-cover-logo-v42"></div>';
  const visual = await resolveBrandVisual(company, originalUrl);
  cover.style.setProperty('--document-client-brand', visual.color);
  cover.style.setProperty('--document-client-brand-fg', visual.dark ? '#FFFFFF' : '#5A1E2D');
  preview.classList.add('document-brand-preview-v45');

  const logoBox = cover.querySelector<HTMLElement>('.document-auto-cover-logo-v42');
  if (!logoBox) return;
  logoBox.replaceChildren();
  const coverLogo = originalUrl || workspaceUrl;
  if (coverLogo) {
    const image = document.createElement('img');
    image.src = coverLogo;
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
  const [workspaceUrl, originalUrl] = await Promise.all([resolveWorkspaceLogo(company), resolveOriginalLogo(company)]);
  const tile = card.querySelector<HTMLElement>('.document-client-logo-v3');
  if (tile) setClientLogo(tile, company, workspaceUrl);
  ensureProjectLegend(card);
  await ensureAutomaticCover(card, company, originalUrl, workspaceUrl);
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
