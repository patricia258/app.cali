import { z } from 'zod';
import { supabaseEnvironment } from '../client-environment';
import { isSupabaseConfigured, supabase } from '../supabase';

const { url, key } = supabaseEnvironment ?? { url: '', key: '' };

const accessResponse = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  role: z.enum(['admin', 'client', 'partner']).optional(),
  challenge: z.string().optional(),
  token_hash: z.string().min(1).optional(),
  session: z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1) }).optional(),
});

type AccessRequest = { action: 'request'; email: string } | { action: 'verify'; email: string; code: string };

async function workspaceAccessRequest(body: AccessRequest) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase ainda não configurado neste ambiente.' } };
  }

  try {
    const response = await fetch(`${url}/functions/v1/workspace-access`, {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, website: '' }),
    });
    const payload = accessResponse.safeParse(await response.json().catch(() => null));
    if (!payload.success || !response.ok || payload.data.ok === false) {
      const message = payload.success ? payload.data.error : undefined;
      return { data: null, error: { message: message || 'Não foi possível concluir o acesso.' } };
    }
    return { data: payload.data, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Não foi possível concluir o acesso.' } };
  }
}

export function requestAccessCode(email: string) {
  return workspaceAccessRequest({ action: 'request', email: email.trim() });
}

export async function verifyAccessCode(email: string, code: string) {
  const result = await workspaceAccessRequest({ action: 'verify', email: email.trim(), code });
  if (result.error || !result.data || !supabase) return result;

  const { session, token_hash, role } = result.data;
  const verified = session
    ? await supabase.auth.setSession(session)
    : token_hash
      ? await supabase.auth.verifyOtp({ token_hash, type: 'email' })
      : null;
  if (!verified?.data.session || verified.error) {
    return { data: null, error: { message: verified?.error?.message || 'Não foi possível confirmar seu acesso.' } };
  }
  return { data: { ok: true, role }, error: null };
}
