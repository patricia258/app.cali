const productionOrigin = 'https://app.calirh.com';
const productionProject = 'kqtbfeeqbcllwvlkbrkq.supabase.co';
const loopback = new Set(['127.0.0.1', 'localhost', '[::1]']);

export function isPublicSupabaseKey(key: string): boolean {
  if (/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)) return true;
  const parts = key.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'anon';
  } catch {
    return false;
  }
}

export function readSupabaseEnvironment({
  url,
  key,
  origin,
  allowProduction,
}: {
  url?: string;
  key?: string;
  origin: string;
  allowProduction: boolean;
}): { url: string; key: string } | null {
  if (!url || !key || !isPublicSupabaseKey(key)) return null;

  try {
    const target = new URL(url);
    const local = loopback.has(target.hostname);
    if (
      (target.protocol !== 'https:' && !(local && target.protocol === 'http:')) ||
      target.username || target.password || target.pathname !== '/' || target.search || target.hash ||
      (local && !loopback.has(new URL(origin).hostname)) ||
      (target.hostname === productionProject && (!allowProduction || origin !== productionOrigin))
    ) return null;

    return { url: target.origin, key };
  } catch {
    return null;
  }
}
