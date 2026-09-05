import { supabase } from './supabase';

type ProfileMedia = {
  full_name?: string;
  role?: string | null;
  company_id?: string | null;
  avatar_url?: string;
  avatar_position_x?: number;
  avatar_position_y?: number;
  avatar_zoom?: number;
};

type CompanyMedia = {
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
};

const ADMIN_PROFILE_KEY = 'cali-workspace-profile-admin';
const COMPANY_FRAME_SELECTORS = [
  '.project-client-mark',
  '.company-mark',
  '.company-logo',
  '.company-logo-slot',
  '.company-logo-editor',
  '.bar-client-logo',
  '.client-logo',
  '.client-mark',
  '.account-company-logo',
  '.deadline-logo-v2',
  '.people-map-company-mark',
  '.people-map-company-avatar',
  '.project-client-logo-v39',
].join(',');

let companies: CompanyMedia[] = [];
let profiles: ProfileMedia[] = [];
let observer: MutationObserver | null = null;
let scheduled = false;
let companyLoadStarted = false;
let profileLoadStarted = false;
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

function isReportSurface(frame: HTMLElement) {
  if (location.pathname.includes('/relatorios') || location.pathname.includes('/reports')) return true;
  return Boolean(frame.closest('.report-page,.report-preview,.report-document,.pdf-page,[data-document-surface="report"]'));
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
  frame.style.setProperty('--identity-size', kind === 'person' ? `${zoom * 100}%` : 'cover');
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
  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const context = normalize(current.textContent || '');
    if (!context) continue;
    const match = companies
      .filter((item) => item.logo_workspace_url || item.logo_url)
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

function profileForAuthor(value: string) {
  const author = normalize(value);
  if (!author) return null;
  const admin = profiles.find((profile) => profile.role === 'admin' && profile.avatar_url);
  if (author.includes('patricia') || author.includes('cali') || author.includes('nota interna')) return admin || readAdminProfile();
  return profiles
    .filter((profile) => profile.avatar_url && profile.full_name)
    .sort((a, b) => String(b.full_name).length - String(a.full_name).length)
    .find((profile) => author.includes(normalize(profile.full_name || ''))) || null;
}

function decorateConversation() {
  const fallbackAdmin = readAdminProfile();

  document.querySelectorAll<HTMLElement>('.conversation-list-v2 article').forEach((article) => {
    const frame = article.querySelector<HTMLElement>('.conversation-avatar-v2');
    if (!frame || !isSimpleFrame(frame)) return;

    const authorText = article.querySelector('header strong')?.textContent || '';
    const profile = profileForAuthor(authorText);
    if (profile?.avatar_url) {
      applyMedia(frame, profile.avatar_url, 'person', profile);
      return;
    }
    const author = normalize(authorText);
    if ((author.includes('patricia') || author.includes('cali')) && fallbackAdmin.avatar_url) {
      applyMedia(frame, fallbackAdmin.avatar_url, 'person', fallbackAdmin);
      return;
    }
    clearIdentity(frame);
    hideInitial(frame);
  });
}

function decorateAdminInitials() {
  const admin = profiles.find((profile) => profile.role === 'admin' && profile.avatar_url) || readAdminProfile();
  if (!admin.avatar_url) return;

  document.querySelectorAll<HTMLElement>('[class*="avatar"], [class*="profile"], [class*="mark"]').forEach((frame) => {
    if (!isSimpleFrame(frame)) return;
    const text = normalize(frame.textContent || '');
    if (text === 'pl') applyMedia(frame, admin.avatar_url!, 'person', admin);
  });
}

function decorateCompanyFrames() {
  document.querySelectorAll<HTMLElement>(COMPANY_FRAME_SELECTORS).forEach((frame) => {
    if (!isSimpleFrame(frame) || isReportSurface(frame)) return;
    const company = companyForContext(frame);
    const logo = company?.logo_workspace_url || company?.logo_url;
    if (logo) {
      applyMedia(frame, logo, 'company');
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
      .select('display_name,logo_url,logo_workspace_url')
      .order('display_name');
    companies = await Promise.all(((data || []) as CompanyMedia[]).map(async (item) => ({
      ...item,
      logo_url: await resolvePrivateMedia(item.logo_url),
      logo_workspace_url: await resolvePrivateMedia(item.logo_workspace_url),
    })));
    scheduleDecorate();
  } catch {
    // A identidade pessoal continua funcionando mesmo sem leitura de empresas.
  }
}

async function loadProfiles() {
  if (profileLoadStarted || !supabase) return;
  profileLoadStarted = true;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name,role,company_id,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom')
      .eq('active',true);
    const loaded = await Promise.all(((data || []) as ProfileMedia[]).map(async (item) => ({ ...item, avatar_url: await resolvePrivateMedia(item.avatar_url) })));
    profiles = loaded;
    if (!profiles.some((profile) => profile.role === 'admin') && location.pathname.startsWith('/cliente/')) {
      const contact = await supabase.rpc('get_client_account_contact');
      const row = Array.isArray(contact.data) ? contact.data[0] : contact.data;
      if (row) profiles.push({ ...row, role:'admin', avatar_url: await resolvePrivateMedia(row.avatar_url) });
    }
    scheduleDecorate();
  } catch {
    // Fallback do perfil local continua disponível.
  }
}

export function startIdentityMediaRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (observer) return;

  scheduleDecorate();
  void loadCompanies();
  void loadProfiles();

  observer = new MutationObserver(() => scheduleDecorate());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('storage', scheduleDecorate);
  window.addEventListener('focus', scheduleDecorate);
  window.addEventListener('cali-profile-updated', scheduleDecorate as EventListener);
}
