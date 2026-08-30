import { createClient } from '@supabase/supabase-js';

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

/*
 * Cliente dedicado ao schema public (Mapa de People / Portal).
 * RPCs administrativas usam o token real do Workspace em uma chamada REST
 * explicitamente marcada como schema public. Elas nao dependem do schema
 * cali_workspace para validar o admin, evitando bloqueio cruzado de schemas.
 */
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

/*
 * O restante do Workspace continua usando cali_workspace.
 * Modulos que pedem schema('public') recebem a ponte publica dedicada.
 */
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

        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : null;

export async function sendMagicLink(email: string) {
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
      body: JSON.stringify({ email: email.trim(), website: '' }),
    });

    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      return { data: null, error: { message: payload.error || 'Não foi possível enviar o link de acesso.' } };
    }

    return { data: { ok: true }, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Não foi possível enviar o link de acesso.' },
    };
  }
}
