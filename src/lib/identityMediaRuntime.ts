import { supabase } from './supabase';

type ProfileMedia = {
  full_name?: string;
  avatar_url?: string;
  avatar_position_x?: number;
  avatar_position_y?: number;
  avatar_zoom?: number;
};

type CompanyMedia = {
  display_name: string;
  logo_url?: string | null;
};

const ADMIN_PROFILE_KEY = 'cali-workspace-profile-admin';
const COMPANY_FRAME_SELECTORS = [
  '.project-client-mark',
  '.company-mark',
  '.company-logo',
  '.bar-client-logo',
  '.client-logo',
  '.client-mark',
  '.account-company-logo',
  '.people-map-company-mark',
  '.people-map-company-avatar',
].join(',');

let companies: CompanyMedia[] = [];
let observer: MutationObserver | null = null;
let scheduled = false;
let companyLoadStarted = false;
const signedMediaCache = new Map<string, string>();

function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolvePrivateMedia(raw?: string | null) {
  if (!raw || !supabase || !raw.startsWith('private:')) return raw || '';
  const cached = signedMediaCache.get(raw);
  if (cached) return cached;
  const { data, error } = await supabase.storage
    .from('cali-workspace-private')
    .createSignedUrl(raw.slice('private:'.length), 3600);
  if (error || !data?.signedUrl) return '';
  signedMediaCache.set(raw, data.signedUrl);
  return data.signedUrl;
}

function readAdminProfile(): ProfileMedia {
  try {
    const raw = window.localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProfileMedia;
  } catch {
    return {};
  }
}

function isSimpleFrame(frame: HTMLElement) {
  return frame.children.length === 0;
}

function clearIdentity(frame: HTMLElement) {
  frame.dataset.identitySrc = '';
  frame.classList.remove('identity-media-frame', 'identity-media-person', 'identity-media-company', 'identity-media-empty');
  frame.style.removeProperty('--identity-image');
  frame.style.removeProperty('--identity-position');
  frame.style.removeProperty('--identity-size');
}

function applyMedia(frame: HTMLElement, src: string, kind: 'person' | 'company', profile?: ProfileMedia) {
  if (!src || !isSimpleFrame(frame)) return;
  if (frame.dataset.identitySrc === src && frame.classList.contains('identity-media-frame')) return;

  const x = Number(profile?.avatar_position_x ?? 50);
  const y = Number(profile?.avatar_position_y ?? 50);
  const zoom = Math.max(1, Number(profile?.avatar_zoom ?? 1));

  frame.dataset.identitySrc = src;
  frame.classList.remove('identity-media-person', 'identity-media-company', 'identity-media-empty');
  frame.classList.add('identity-media-frame', kind === 'person' ? 'identity-media-person' : 'identity-media-company');
  frame.style.setProperty('--identity-image', `url("${src.replace(/"/g, '\\"')}")`);
  frame.style.setProperty('--identity-position', kind === 'person' ? `${x}% ${y}%` : 'center');
  frame.style.setProperty('--identity-size', kind === 'person' ? `${zoom * 100}%` : 'contain');
}

function hideInitial(frame: HTMLElement) {
  if (!isSimpleFrame(frame)) return;
  const text = frame.textContent?.trim() || '';
  if (/^[A-ZÀ-Ü0-9]{1,3}$/i.test(text)) {
    frame.classList.add('identity-media-frame', 'identity-media-empty');
  }
}

function companyForContext(frame: HTMLElement) {
  const explicitButton = frame.closest('.project-selector-v2 > button');
  const explicitName = explicitButton?.querySelector('strong')?.textContent?.trim();
  if (explicitName) {
    const match = companies.find((item) => normalize(item.display_name) === normalize(explicitName));
    if (match) return match;
  }

  let current: HTMLElement | null = frame.parentElement;
  for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
    const context = normalize(current.textContent || '');
    if (!context) continue;
    const match = companies
      .filter((item) => item.logo_url)
      .sort((a, b) => b.display_name.length - a.display_name.length)
      .find((item) => context.includes(normalize(item.display_name)));
    if (match) return match;
  }
  return null;
}

function activeProjectCompany() {
  const name = document.querySelector('.project-selector-v2 > button.active strong')?.textContent?.trim();
  if (!name) return null;
  return companies.find((item) => normalize(item.display_name) === normalize(name)) || null;
}

function decorateConversation() {
  const admin = readAdminProfile();
  const activeCompany = activeProjectCompany();

  document.querySelectorAll<HTMLElement>('.conversation-list-v2 article').forEach((article) => {
    const frame = article.querySelector<HTMLElement>('.conversation-avatar-v2');
    if (!frame || !isSimpleFrame(frame)) return;

    const author = normalize(article.querySelector('header strong')?.textContent || '');
    const isCali = author.includes('patricia') || author.includes('cali') || author.includes('nota interna');

    if (isCali && admin.avatar_url) {
      applyMedia(frame, admin.avatar_url, 'person', admin);
      return;
    }
    if (!isCali && activeCompany?.logo_url) {
      applyMedia(frame, activeCompany.logo_url, 'company');
      return;
    }
    clearIdentity(frame);
    hideInitial(frame);
  });
}

function decorateAdminInitials() {
  const admin = readAdminProfile();
  if (!admin.avatar_url) return;

  document.querySelectorAll<HTMLElement>('[class*="avatar"], [class*="profile"], [class*="mark"]').forEach((frame) => {
    if (!isSimpleFrame(frame)) return;
    const text = normalize(frame.textContent || '');
    if (text === 'pl') applyMedia(frame, admin.avatar_url!, 'person', admin);
  });
}

function decorateCompanyFrames() {
  document.querySelectorAll<HTMLElement>(COMPANY_FRAME_SELECTORS).forEach((frame) => {
    if (!isSimpleFrame(frame)) return;
    const company = companyForContext(frame);
    if (company?.logo_url) {
      applyMedia(frame, company.logo_url, 'company');
      return;
    }
    clearIdentity(frame);
    hideInitial(frame);
  });
}

function decoratePrivateImages() {
  document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const raw = image.getAttribute('src') || '';
    if (!raw.startsWith('private:') || image.dataset.privateMediaPending === raw) return;
    image.dataset.privateMediaPending = raw;
    void resolvePrivateMedia(raw).then((signed) => {
      if (!signed) return;
      image.setAttribute('src', signed);
      image.dataset.privateMediaResolved = 'true';
      delete image.dataset.privateMediaPending;
    });
  });
}

function decorateIdentityMedia() {
  scheduled = false;
  decorateConversation();
  decorateAdminInitials();
  decorateCompanyFrames();
  decoratePrivateImages();
}

function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(decorateIdentityMedia);
}

async function loadCompanies() {
  if (companyLoadStarted || !supabase) return;
  companyLoadStarted = true;
  try {
    const { data } = await supabase
      .from('companies')
      .select('display_name,logo_url')
      .neq('status', 'closed')
      .order('display_name');
    companies = await Promise.all(((data || []) as CompanyMedia[]).map(async (item) => ({
      ...item,
      logo_url: await resolvePrivateMedia(item.logo_url),
    })));
    scheduleDecorate();
  } catch {
    // A identidade pessoal continua funcionando mesmo sem leitura de empresas.
  }
}

export function startIdentityMediaRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (observer) return;

  scheduleDecorate();
  void loadCompanies();

  // Observa somente criação/remoção de nós. Nunca remove elementos da árvore React.
  observer = new MutationObserver(() => scheduleDecorate());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('storage', scheduleDecorate);
  window.addEventListener('cali-profile-updated', scheduleDecorate as EventListener);
}
