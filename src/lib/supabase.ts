import { createClient } from '@supabase/supabase-js';
import { optimizeImageBeforeUpload, type SupportedRasterType } from './imageUploadOptimization';

const fallbackUrl = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const fallbackPublishableKey = 'sb_publishable_rhIy864X0VSQ0B7m7gdmCQ_hX3sKFMg';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || fallbackUrl;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || fallbackPublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const workspaceSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      db: { schema: 'cali_workspace' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const rawPublicSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      db: { schema: 'public' },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'cali-public-transient-auth',
      },
    })
  : null;

type RpcResult<T = unknown> = { data: T | null; error: { message: string } | null };

const rasterUploadTypes = new Set<SupportedRasterType>(['image/jpeg', 'image/png', 'image/webp']);

async function optimizeWorkspaceStorageUpload(bucket: string, path: string, body: unknown) {
  const isClientBrandLogo = bucket === 'cali-workspace-private' && /\/brand\/logo-[^/]+\.(?:png|jpe?g|webp)$/i.test(path);
  if (!isClientBrandLogo || typeof File === 'undefined' || !(body instanceof File)) return body;
  if (!rasterUploadTypes.has(body.type as SupportedRasterType)) return body;

  return optimizeImageBeforeUpload(body, {
    maxWidth: 1600,
    maxHeight: 800,
    quality: 0.88,
    outputType: body.type as SupportedRasterType,
  });
}

const workspaceStorage = workspaceSupabase
  ? new Proxy(workspaceSupabase.storage as any, {
      get(target, prop, receiver) {
        if (prop === 'from') {
          return (bucket: string) => {
            const fileApi = target.from(bucket);
            return new Proxy(fileApi as any, {
              get(fileTarget, fileProp, fileReceiver) {
                if (fileProp === 'upload') {
                  return async (path: string, body: unknown, options?: unknown) => {
                    const optimizedBody = await optimizeWorkspaceStorageUpload(bucket, path, body);
                    return fileTarget.upload(path, optimizedBody as any, options as any);
                  };
                }
                const value = Reflect.get(fileTarget, fileProp, fileReceiver);
                return typeof value === 'function' ? value.bind(fileTarget) : value;
              },
            });
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : null;

async function directPublicRpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
  if (!workspaceSupabase) {
    return { data: null, error: { message: 'Supabase não configurado.' } };
  }

  const { data: sessionData, error: sessionError } = await workspaceSupabase.auth.getSession();
  if (sessionError) return { data: null, error: { message: sessionError.message } };
  if (!sessionData.session?.access_token) {
    return { data: null, error: { message: 'Sessão administrativa não encontrada. Entre novamente no Workspace.' } };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(fn)}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'public',
        'Content-Profile': 'public',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(args || {}),
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }

    if (!response.ok) {
      const message = typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message || `Erro ${response.status}`)
        : String(payload || `Erro ${response.status}`);
      return { data: null, error: { message } };
    }

    return { data: payload as T, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Falha de conexão com o Supabase.' } };
  }
}

export const publicSupabase = rawPublicSupabase
  ? new Proxy(rawPublicSupabase, {
      get(target, prop, receiver) {
        if (prop === 'rpc') {
          return (fn: string, args?: Record<string, unknown>) => directPublicRpc(fn, args);
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : null;

export const supabase = workspaceSupabase
  ? new Proxy(workspaceSupabase, {
      get(target, prop, receiver) {
        if (prop === 'schema') {
          return (schema: string) => {
            if (schema === 'public' && publicSupabase) return publicSupabase;
            return target.schema(schema);
          };
        }

        if (prop === 'rpc') {
          return (fn: string, args?: Record<string, unknown>, options?: Record<string, unknown>) => {
            if (fn === 'update_mapa_people_record' && publicSupabase) {
              return (publicSupabase as any).rpc('workspace_update_mapa_people_record', args, options);
            }
            return (target.rpc as any)(fn, args, options);
          };
        }

        if (prop === 'storage' && workspaceStorage) return workspaceStorage;

        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : null;

type AccessResponse = { ok?: boolean; error?: string; token_hash?: string; role?: 'admin' | 'client'; challenge?: string };

async function workspaceAccessRequest(body: Record<string, unknown>) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase ainda não configurado neste ambiente.' } };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/workspace-access`, {
      method: 'POST',
      headers: {
        apikey: supabasePublishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, website: '' }),
    });
    const payload = await response.json().catch(() => ({})) as AccessResponse;
    if (!response.ok) {
      return { data: null, error: { message: payload.error || 'Não foi possível concluir o acesso.' } };
    }
    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Não foi possível concluir o acesso.' } };
  }
}

export function requestAccessCode(email: string) {
  return workspaceAccessRequest({ action: 'request', email: email.trim() });
}

export async function verifyAccessCode(email: string, code: string) {
  const result = await workspaceAccessRequest({ action: 'verify', email: email.trim(), code });
  if (result.error || !result.data?.token_hash || !workspaceSupabase) return result;

  const { error: verifyError } = await workspaceSupabase.auth.verifyOtp({
    token_hash: result.data.token_hash,
    type: 'email',
  });
  if (verifyError) return { data: null, error: { message: verifyError.message } };
  return result;
}

// Compatibilidade temporária com chamadas antigas: passa a solicitar código, não link.
export function sendMagicLink(email: string) {
  return requestAccessCode(email);
}
