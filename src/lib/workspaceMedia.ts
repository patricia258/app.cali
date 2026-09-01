import { supabase } from './supabase';

const signedMediaCache = new Map<string, string>();

export async function resolveWorkspaceMedia(raw?: string | null, expiresIn = 3600) {
  if (!raw || !supabase || !raw.startsWith('private:')) return raw || '';
  const cached = signedMediaCache.get(raw);
  if (cached) return cached;
  const { data, error } = await supabase.storage
    .from('cali-workspace-private')
    .createSignedUrl(raw.slice('private:'.length), expiresIn);
  if (error || !data?.signedUrl) return '';
  signedMediaCache.set(raw, data.signedUrl);
  return data.signedUrl;
}
