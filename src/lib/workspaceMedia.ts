import { supabase } from './supabase';

type CachedMedia = { url: string; expiresAt: number };

const signedMediaCache = new Map<string, CachedMedia>();
const pendingMedia = new Map<string, Promise<string>>();
const STORAGE_KEY = 'cali-workspace-media-cache-v1';

function readStoredMedia(key: string) {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, CachedMedia>;
    return parsed[key] || null;
  } catch {
    return null;
  }
}

function storeMedia(key: string, value: CachedMedia) {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}') as Record<string, CachedMedia>;
    parsed[key] = value;
    const live = Object.fromEntries(Object.entries(parsed).filter(([, item]) => item.expiresAt > Date.now() + 60_000));
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(live));
  } catch {
    // O cache persistente é uma otimização; a imagem continua carregando sem ele.
  }
}

function normalizePrivateMedia(raw: string) {
  if (raw.startsWith('private:')) return raw;

  const marker = '/storage/v1/object/sign/cali-workspace-private/';
  const index = raw.indexOf(marker);
  if (index < 0) return raw;

  const encodedPath = raw.slice(index + marker.length).split('?')[0];
  try {
    return `private:${decodeURIComponent(encodedPath)}`;
  } catch {
    return `private:${encodedPath}`;
  }
}

export async function resolveWorkspaceMedia(raw?: string | null, expiresIn = 3600, forceRefresh = false) {
  if (!raw || !supabase) return raw || '';

  const normalized = normalizePrivateMedia(raw);
  if (!normalized.startsWith('private:')) return raw;

  const cached = signedMediaCache.get(normalized) || readStoredMedia(normalized);
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now + 60_000) {
    signedMediaCache.set(normalized, cached);
    return cached.url;
  }

  const inFlight = pendingMedia.get(normalized);
  if (inFlight) return inFlight;

  const path = normalized.slice('private:'.length);
  const request = (async () => {
    const { data, error } = await supabase.storage
      .from('cali-workspace-private')
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      signedMediaCache.delete(normalized);
      return '';
    }

    const value = {
      url: data.signedUrl,
      expiresAt: now + Math.max(60, expiresIn) * 1000,
    };
    signedMediaCache.set(normalized, value);
    storeMedia(normalized, value);
    return data.signedUrl;
  })();
  pendingMedia.set(normalized, request);
  try {
    return await request;
  } finally {
    pendingMedia.delete(normalized);
  }
}
