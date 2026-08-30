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
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

async function syncPublicSession() {
  if (!workspaceSupabase || !rawPublicSupabase) return;

  const { data, error } = await workspaceSupabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return;

  const { data: publicData } = await rawPublicSupabase.auth.getSession();
  if (publicData.session?.access_token === data.session.access_token) return;

  const { error: setSessionError } = await rawPublicSupabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (setSessionError) throw setSessionError;
}

/*
 * Cliente dedicado ao schema public (Mapa de People / Portal).
 * O RPC e sincronizado com a sessao do Workspace antes de cada chamada,
 * evitando corrida entre a inicializacao dos dois clientes Supabase.
 */
export const publicSupabase = rawPublicSupabase
  ? new Proxy(rawPublicSupabase, {
      get(target, prop, receiver) {
        if (prop === 'rpc') {
          return async (fn: string, args?: Record<string, unknown>, options?: Record<string, unknown>) => {
            await syncPublicSession();
            return (target.rpc as any)(fn, args, options);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : null;

if (workspaceSupabase && rawPublicSupabase) {
  void syncPublicSession();

  workspaceSupabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      void rawPublicSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } else {
      void rawPublicSupabase.auth.signOut({ scope: 'local' });
    }
  });
}

/*
 * O restante do Workspace continua usando cali_workspace.
 * Modulos que pedem schema('public') recebem o cliente public dedicado.
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
  if (!supabase) {
    throw new Error('Supabase ainda não configurado neste ambiente.');
  }

  const redirectTo = `${window.location.origin}/auth/callback`;
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });
}
