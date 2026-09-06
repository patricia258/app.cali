import { supabase } from './supabase';

type ProfileMedia = {
  id?: string | null;
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
let profileLoading = false;
let profilesLoaded = false;
let tooltipTimer = 0;
const signedMediaCache = new Map<string, string>();

function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function mediaKey(value?: string | null) {
  if (!value) return '';
  if (value.startsWith('private:')) return value.split('?')[0];
  try {
    const url = new URL(value, location.href);
    return decodeURIComponent(url.pathname).replace(/\/+$/g, '');
  } catch {
    return value.split(/[?#]/)[0];
  }
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

function ensurePolishStyles() {
  if (document.getElementById('cali-identity-profile-polish-v47')) return;
  const style = document.createElement('style');
  style.id = 'cali-identity-profile-polish-v47';
  style.textContent = `
    .identity-media-person.profile-canonical-v47,
    .records-chat-avatar.profile-canonical-v47,
    .conversation-avatar-v2.profile-canonical-v47{
      position:relative!important;
      overflow:hidden!important;
      border-radius:14px!important;
      background:#F7F3EE!important;
      background-image:none!important;
      border-color:#E3D7CE!important;
      color:transparent!important;
      isolation:isolate!important;
    }
    .identity-media-person.profile-canonical-v47::before,
    .records-chat-avatar.profile-canonical-v47::before,
    .conversation-avatar-v2.profile-canonical-v47::before{
      content:""!important;
      position:absolute!important;
      inset:0!important;
      z-index:0!important;
      background-image:var(--profile-image,none)!important;
      background-repeat:no-repeat!important;
      background-position:var(--profile-position,50% 50%)!important;
      background-size:cover!important;
      transform:scale(var(--profile-zoom,1))!important;
      transform-origin:var(--profile-position,50% 50%)!important;
      pointer-events:none!important;
    }
    .profile-person-frame-v47{
      overflow:hidden!important;
      border-radius:14px!important;
      background:#F7F3EE!important;
      border-color:#E3D7CE!important;
    }
    img.profile-person-image-v47{
      display:block!important;
      width:100%!important;
      height:100%!important;
      object-fit:cover!important;
      object-position:var(--profile-position,50% 50%)!important;
      transform:scale(var(--profile-zoom,1))!important;
      transform-origin:var(--profile-position,50% 50%)!important;
      border-radius:inherit!important;
    }
    [data-workspace-theme="night"] .identity-media-person.profile-canonical-v47,
    [data-workspace-theme="night"] .records-chat-avatar.profile-canonical-v47,
    [data-workspace-theme="night"] .conversation-avatar-v2.profile-canonical-v47,
    [data-workspace-theme="night"] .profile-person-frame-v47{
      background:#F7F3EE!important;
      border-color:#E3D7CE!important;
    }
    .front-header-v2:has(>img.front-collapse-trigger-v46:hover)::after{
      content:none!important;
      display:none!important;
    }
    .front-toggle-toast-v47{
      position:fixed!important;
      z-index:2147483000!important;
      max-width:min(300px,calc(100vw - 24px))!important;
      padding:9px 12px!important;
      border:1px solid #E8DDD5!important;
      border-radius:12px!important;
      background:#FFFCF8!important;
      color:#2D2927!important;
      box-shadow:0 12px 28px rgba(42,25,30,.16)!important;
      font:750 12px/1.35 Inter,system-ui,sans-serif!important;
      pointer-events:none!important;
      opacity:0!important;
      transform:translateY(4px)!important;
      transition:opacity .16s ease,transform .16s ease!important;
      white-space:normal!important;
    }
    .front-toggle-toast-v47.show{
      opacity:1!important;
      transform:translateY(0)!important;
    }
  `;
  document.head.append(style);
}

function clearIdentity(frame: HTMLElement) {
  frame.dataset.identitySrc = '';
  frame.dataset.profileSignatureV47 = '';
  frame.classList.remove('identity-media-frame', 'identity-media-person', 'identity-media-company', 'identity-media-empty', 'profile-canonical-v47');
  frame.style.removeProperty('--identity-image');
  frame.style.removeProperty('--identity-position');
  frame.style.removeProperty('--identity-size');
  frame.style.removeProperty('--profile-image');
  frame.style.removeProperty('--profile-position');
  frame.style.removeProperty('--profile-zoom');
}

function applyMedia(frame: HTMLElement, src: string, kind: 'person' | 'company', profile?: ProfileMedia) {
  if (!src || !isSimpleFrame(frame)) return;
  const x = Number(profile?.avatar_position_x ?? 50);
  const y = Number(profile?.avatar_position_y ?? 50);
  const zoom = Math.max(1, Number(profile?.avatar_zoom ?? 1));
  const signature = `${src}|${kind}|${x}|${y}|${zoom}`;
  if (frame.dataset.profileSignatureV47 === signature) return;

  frame.dataset.identitySrc = src;
  frame.dataset.profileSignatureV47 = signature;
  frame.classList.remove('identity-media-person', 'identity-media-company', 'identity-media-empty');
  frame.classList.add('identity-media-frame', kind === 'person' ? 'identity-media-person' : 'identity-media-company');
  frame.style.setProperty('--identity-image', `url("${src.replace(/"/g, '\\"')}")`);
  frame.style.setProperty('--identity-position', kind === 'person' ? `${x}% ${y}%` : 'center');
  frame.style.setProperty('--identity-size', kind === 'person' ? `${zoom * 100}%` : 'cover');

  if (kind === 'person') {
    frame.classList.add('profile-canonical-v47');
    frame.style.setProperty('--profile-image', `url("${src.replace(/"/g, '\\"')}")`);
    frame.style.setProperty('--profile-position', `${x}% ${y}%`);
    frame.style.setProperty('--profile-zoom', String(zoom));
  } else {
    frame.classList.remove('profile-canonical-v47');
    frame.style.removeProperty('--profile-image');
    frame.style.removeProperty('--profile-position');
    frame.style.removeProperty('--profile-zoom');
  }
}

function hideInitial(frame: HTMLElement) {
  if (!isSimpleFrame(frame)) return;
  const text = frame.textContent?.trim() || '';
  if (/^[A-ZÀ-Ü0-9]{1,3}$/i.test(text)) frame.classList.add('identity-media-frame', 'identity-media-empty');
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

function profileForSource(value?: string | null) {
  const key = mediaKey(value);
  if (!key) return null;
  return profiles.find((profile) => profile.avatar_url && mediaKey(profile.avatar_url) === key) || null;
}

function profileForNearbyText(image: HTMLImageElement) {
  let current: HTMLElement | null = image.parentElement;
  for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
    const text = current.textContent?.trim() || '';
    if (!text || text.length > 320) continue;
    const normalizedText = normalize(text);
    const match = profiles
      .filter((profile) => profile.avatar_url && profile.full_name)
      .sort((a, b) => String(b.full_name).length - String(a.full_name).length)
      .find((profile) => normalizedText.includes(normalize(profile.full_name || '')));
    if (match) return match;
  }
  return null;
}

function applyProfileImage(image: HTMLImageElement, profile: ProfileMedia) {
  if (!profile.avatar_url || image.closest('.profile-avatar-editor.large-editor-avatar')) return;
  const x = Number(profile.avatar_position_x ?? 50);
  const y = Number(profile.avatar_position_y ?? 50);
  const zoom = Math.max(1, Number(profile.avatar_zoom ?? 1));
  const signature = `${profile.avatar_url}|${x}|${y}|${zoom}`;
  if (image.dataset.profileImageSignatureV47 === signature) return;

  image.dataset.profileImageSignatureV47 = signature;
  image.classList.add('profile-person-image-v47');
  image.style.setProperty('--profile-position', `${x}% ${y}%`);
  image.style.setProperty('--profile-zoom', String(zoom));

  const parent = image.parentElement;
  if (!parent) return;
  const className = `${parent.className || ''} ${image.className || ''}`;
  const avatarLike = /avatar|profile|photo|person|contact|respond|decision|user/i.test(className);
  if (parent.children.length === 1 || avatarLike) parent.classList.add('profile-person-frame-v47');
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

function decorateRecordsConversation() {
  document.querySelectorAll<HTMLElement>('.records-chat-line').forEach((line) => {
    const frame = line.querySelector<HTMLElement>('.records-chat-avatar');
    if (!frame || !isSimpleFrame(frame)) return;
    const authorText = line.querySelector<HTMLElement>('.records-chat-head strong')?.textContent || '';
    const byAuthor = profileForAuthor(authorText);
    const bySource = profileForSource(frame.dataset.identitySrc || frame.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]);
    const profile = byAuthor || bySource;
    if (profile?.avatar_url) {
      applyMedia(frame, profile.avatar_url, 'person', profile);
      return;
    }
    clearIdentity(frame);
    hideInitial(frame);
  });
}

function decoratePersonImages() {
  document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (image.closest('.report-page,.report-preview,.report-document,.pdf-page,[data-document-surface="report"]')) return;
    if (image.closest(COMPANY_FRAME_SELECTORS)) return;
    const alt = normalize(image.alt || '');
    if (alt.includes('logo') || alt.includes('marca cali')) return;
    const src = image.currentSrc || image.getAttribute('src') || '';
    const profile = profileForSource(src) || profileForNearbyText(image);
    if (profile) applyProfileImage(image, profile);
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

function frontTipText(trigger: HTMLImageElement) {
  return trigger.getAttribute('aria-expanded') === 'true'
    ? 'Clique para recolher os entregáveis'
    : 'Clique para visualizar os entregáveis';
}

function getFrontToast() {
  let toast = document.querySelector<HTMLElement>('.front-toggle-toast-v47');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'front-toggle-toast-v47';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  return toast;
}

function showFrontTip(trigger: HTMLImageElement) {
  trigger.removeAttribute('title');
  const header = trigger.closest<HTMLElement>('.front-header-v2');
  header?.removeAttribute('data-front-toggle-tip');
  const toast = getFrontToast();
  toast.textContent = frontTipText(trigger);
  toast.classList.remove('show');
  toast.style.visibility = 'hidden';
  toast.style.left = '12px';
  toast.style.top = '12px';

  window.requestAnimationFrame(() => {
    const triggerRect = trigger.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect() || triggerRect;
    const toastRect = toast.getBoundingClientRect();
    const preferredLeft = triggerRect.right + 12;
    const maxLeft = Math.max(12, window.innerWidth - toastRect.width - 12);
    const left = Math.max(12, Math.min(preferredLeft, maxLeft));
    const preferredTop = headerRect.top + Math.max(8, Math.min(18, (headerRect.height - toastRect.height) / 2));
    const maxTop = Math.max(12, window.innerHeight - toastRect.height - 12);
    const top = Math.max(12, Math.min(preferredTop, maxTop));
    toast.style.left = `${left}px`;
    toast.style.top = `${top}px`;
    toast.style.visibility = 'visible';
    toast.classList.add('show');
  });

  window.clearTimeout(tooltipTimer);
  tooltipTimer = window.setTimeout(() => toast.classList.remove('show'), 5000);
}

function decorateFrontTooltips() {
  document.querySelectorAll<HTMLImageElement>('.front-header-v2 > img.front-collapse-trigger-v46').forEach((trigger) => {
    trigger.removeAttribute('title');
    trigger.closest<HTMLElement>('.front-header-v2')?.removeAttribute('data-front-toggle-tip');
    if (trigger.dataset.frontTipBoundV47 === '1') return;
    trigger.dataset.frontTipBoundV47 = '1';
    trigger.addEventListener('mouseenter', () => showFrontTip(trigger));
    trigger.addEventListener('focus', () => showFrontTip(trigger));
    trigger.addEventListener('click', () => {
      window.setTimeout(() => showFrontTip(trigger), 0);
    });
  });
}

function decorateIdentityMedia() {
  scheduled = false;
  ensurePolishStyles();
  decoratePrivateImages();
  decorateConversation();
  decorateRecordsConversation();
  decorateAdminInitials();
  decorateCompanyFrames();
  decoratePersonImages();
  decorateFrontTooltips();
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

async function loadProfiles(force = false) {
  if (!supabase || profileLoading || (profilesLoaded && !force)) return;
  profileLoading = true;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,role,company_id,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom')
      .eq('active', true);
    const loaded = await Promise.all(((data || []) as ProfileMedia[]).map(async (item) => ({
      ...item,
      avatar_url: await resolvePrivateMedia(item.avatar_url),
    })));
    profiles = loaded;
    if (!profiles.some((profile) => profile.role === 'admin') && location.pathname.startsWith('/cliente/')) {
      const contact = await supabase.rpc('get_client_account_contact');
      const row = Array.isArray(contact.data) ? contact.data[0] : contact.data;
      if (row) profiles.push({ ...row, role: 'admin', avatar_url: await resolvePrivateMedia(row.avatar_url) });
    }
    profilesLoaded = true;
    document.querySelectorAll<HTMLElement>('[data-profile-signature-v47],[data-profile-image-signature-v47]').forEach((element) => {
      delete element.dataset.profileSignatureV47;
      delete element.dataset.profileImageSignatureV47;
    });
    scheduleDecorate();
  } catch {
    // Fallback local permanece disponível.
  } finally {
    profileLoading = false;
  }
}

export function startIdentityMediaRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (observer) return;

  ensurePolishStyles();
  scheduleDecorate();
  void loadCompanies();
  void loadProfiles();

  observer = new MutationObserver(() => scheduleDecorate());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'class', 'title', 'aria-expanded', 'data-front-toggle-tip'],
  });

  window.addEventListener('storage', scheduleDecorate);
  window.addEventListener('focus', scheduleDecorate);
  window.addEventListener('cali-profile-updated', (() => void loadProfiles(true)) as EventListener);
}
