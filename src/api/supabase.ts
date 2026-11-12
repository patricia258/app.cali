import { createClient } from '@supabase/supabase-js';

import { supabaseEnvironment } from './client-environment';

const { url: supabaseUrl, key: supabasePublishableKey } = supabaseEnvironment ?? { url: '', key: '' };

export const isSupabaseConfigured = supabaseEnvironment !== null;

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

/** Chamada pública sem sessão (ex.: CALI Forms em /f/:slug). Só para funções liberadas ao papel anon. */
export async function anonPublicRpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
  if (!supabaseEnvironment) return { data: null, error: { message: 'Supabase não configurado.' } };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(fn)}`, {
      method: 'POST',
      cache: 'no-store',
      headers: { apikey: supabasePublishableKey, 'Content-Type': 'application/json', 'Accept-Profile': 'public', 'Content-Profile': 'public' },
      body: JSON.stringify(args || {}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return { data: null, error: { message: (payload && (payload.message || payload.hint)) || 'Não foi possível concluir agora.' } };
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: { message: 'Sem conexão. Confira a internet e tente de novo.' } };
  }
}

/** Armazenamento sem sessão: envio de arquivos do CALI Forms por quem responde (política só para formulário aberto). */
export const anonStorage = rawPublicSupabase ? rawPublicSupabase.storage : null;

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

        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : null;
