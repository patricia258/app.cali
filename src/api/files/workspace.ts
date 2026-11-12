import { supabaseEnvironment } from '../client-environment';
import { supabase } from '../supabase';

const inlineMime = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export const workspaceStorageAvailable = supabase !== null;

export async function signPrivateWorkspaceMedia(path: string, expiresIn: number) {
  const result = await supabase?.storage.from('cali-workspace-private').createSignedUrl(path, expiresIn);
  return result?.error ? null : result?.data.signedUrl ?? null;
}

async function readPrivateWorkspaceFile(path: string) {
  if (!supabase || !supabaseEnvironment) throw new Error('Serviço indisponível.');
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || /[\u0000-\u001f\\]/.test(part))) {
    throw new Error('O caminho do arquivo é inválido.');
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Entre novamente para abrir este arquivo.');

  const encodedPath = parts.map(encodeURIComponent).join('/');
  const response = await fetch(`${supabaseEnvironment.url}/storage/v1/object/authenticated/cali-workspace-private/${encodedPath}`, {
    headers: { apikey: supabaseEnvironment.key, Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Não foi possível abrir este arquivo com seu acesso.');
  return response.blob();
}

export async function openPrivateWorkspaceFile(path: string, filename = path.split('/').at(-1) || 'documento') {
  const preview = window.open('', '_blank');
  if (preview) preview.opener = null;

  try {
    const blob = await readPrivateWorkspaceFile(path);
    if (preview && !preview.closed && inlineMime.has(blob.type)) {
      const url = URL.createObjectURL(blob);
      preview.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
      return;
    }

    preview?.close();
    const url = URL.createObjectURL(blob.slice(0, blob.size, 'application/octet-stream'));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}
