import { ensureCompanyWorkspaceLogo, resolveCompanyAsset, type CompanyLogoRecord } from './companyWorkspaceLogo';
import { supabase } from './supabase';

type CompanyRow = CompanyLogoRecord & { status?: string | null };

let installed = false;
let timer = 0;
let loading = false;
let cacheAt = 0;
let companies = new Map<string, CompanyRow>();
let resolved = new Map<string, string>();

function key(value = '') {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function isHoursPage() {
  return location.pathname.startsWith('/admin/horas');
}

async function loadCompanies(force = false) {
  if (!supabase) return;
  if (!force && companies.size && Date.now() - cacheAt < 10_000) return;
  const result = await supabase
    .from('companies')
    .select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status')
    .neq('status', 'closed')
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

async function decorateRow(row: HTMLElement) {
  const name = row.querySelector<HTMLElement>('.hours-v13-usage-name strong')?.textContent?.trim() || '';
  const tile = row.querySelector<HTMLElement>('.hours-v13-logo');
  if (!name || !tile) return;
  const company = companies.get(key(name));
  if (!company) return;
  const url = await resolveLogo(company);
  if (!url) return;
  if (tile.dataset.hoursCompanyLogoV41 === url) return;

  tile.dataset.hoursCompanyLogoV41 = url;
  tile.dataset.companyLogoTile = 'true';
  tile.classList.add('workspace-company-logo-tile-v39', 'hours-company-logo-v41');
  tile.replaceChildren();
  const image = document.createElement('img');
  image.src = url;
  image.alt = `Logo ${company.display_name}`;
  image.draggable = false;
  image.decoding = 'async';
  image.className = 'hours-company-logo-image-v41';
  tile.append(image);
  tile.style.removeProperty('color');
  tile.style.removeProperty('background-image');
}

async function scan(force = false) {
  if (loading || !isHoursPage()) return;
  loading = true;
  try {
    await loadCompanies(force);
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.hours-v13-usage-list > article'));
    await Promise.all(rows.map(decorateRow));
  } finally {
    loading = false;
  }
}

function schedule(force = false) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void scan(force), 60);
}

export function installHoursCompanyLogoRuntimeV41() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  schedule(true);
  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest('.hours-v13-usage-list') || Array.from(mutation.addedNodes).some((node) => node instanceof Element && (node.matches('.hours-v13-usage-list,.hours-v13-usage-list *') || node.querySelector?.('.hours-v13-usage-list'))));
    });
    if (relevant) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', () => schedule(true));
  window.addEventListener('popstate', () => schedule(true));
}
