import { signPrivateWorkspaceMedia, workspaceStorageAvailable } from '../api/files/workspace';

type CachedMedia = { url: string; expiresAt: number };
type MediaSession = {
  signal: AbortSignal;
  signed: Map<string, CachedMedia>;
  pending: Map<string, Promise<string>>;
};

let active: MediaSession | null = null;

export function workspaceMediaSignal() {
  return active?.signal;
}

export function activateWorkspaceMedia(signal: AbortSignal) {
  const scope: MediaSession = { signal, signed: new Map(), pending: new Map() };
  active = scope;
  signal.addEventListener('abort', () => {
    scope.signed.clear();
    scope.pending.clear();
    if (active === scope) active = null;
  }, { once: true });
  try {
    window.sessionStorage.removeItem('cali-workspace-media-cache-v1');
  } catch {
    // O navegador pode desabilitar sessionStorage.
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
  if (!raw || !workspaceStorageAvailable) return raw || '';

  const normalized = normalizePrivateMedia(raw);
  if (!normalized.startsWith('private:')) return raw;
  const scope = active;
  if (!scope || scope.signal.aborted) return '';

  const cached = scope.signed.get(normalized);
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now + 60_000) return cached.url;

  const inFlight = scope.pending.get(normalized);
  if (inFlight) return inFlight;

  const path = normalized.slice('private:'.length);
  const request = (async () => {
    const url = await signPrivateWorkspaceMedia(path, expiresIn);

    if (active !== scope || scope.signal.aborted) return '';
    if (!url) {
      scope.signed.delete(normalized);
      return '';
    }

    const value = {
      url,
      expiresAt: now + Math.max(60, expiresIn) * 1000,
    };
    scope.signed.set(normalized, value);
    return url;
  })();
  scope.pending.set(normalized, request);
  try {
    return await request;
  } finally {
    scope.pending.delete(normalized);
  }
}
