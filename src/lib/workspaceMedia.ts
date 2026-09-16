import { supabase } from './supabase';

type CachedMedia = { url: string; expiresAt: number };

const signedMediaCache = new Map<string, CachedMedia>();

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

  const cached = signedMediaCache.get(normalized);
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now + 60_000) return cached.url;

  const path = normalized.slice('private:'.length);
  const { data, error } = await supabase.storage
    .from('cali-workspace-private')
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    signedMediaCache.delete(normalized);
    return '';
  }

  signedMediaCache.set(normalized, {
    url: data.signedUrl,
    expiresAt: now + Math.max(60, expiresIn) * 1000,
  });
  return data.signedUrl;
}
