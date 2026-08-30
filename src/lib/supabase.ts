import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const fallbackPublishableKey = 'sb_publishable_rhIy864X0VSQ0B7m7gdmCQ_hX3sKFMg';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || fallbackUrl;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || fallbackPublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
};

const workspaceSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      db: {
        schema: 'cali_workspace',
      },
      auth: authOptions,
    })
  : null;

/*
 * Cliente dedicado ao schema public.
 * Mapa de People e Portal vivem no mesmo projeto Supabase, mas fora do schema
 * cali_workspace. Manter um client separado evita que o perfil PostgREST do
 * Workspace contamine as chamadas administrativas desses dois produtos.
 * A sessao continua a mesma porque ambos usam o mesmo projeto e storage auth.
 */
export const publicSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

/*
 * Compatibilidade: o restante do Workspace continua usando o client do schema
 * cali_workspace. Quando um modulo legado pedir explicitamente schema('public'),
 * roteamos para o client public real. Assim nao dependemos de sobrescrever
 * Accept-Profile em um client criado originalmente para outro schema.
 */
export const supabase = workspaceSupabase;

if (workspaceSupabase && publicSupabase) {
  const workspaceSchema = workspaceSupabase.schema.bind(workspaceSupabase);
  const workspaceRpc = workspaceSupabase.rpc.bind(workspaceSupabase);

  (workspaceSupabase as any).schema = (schema: string) => {
    if (schema === 'public') return publicSupabase;
    return workspaceSchema(schema);
  };

  (workspaceSupabase as any).rpc = (fn: string, args?: Record<string, unknown>, options?: Record<string, unknown>) => {
    if (fn === 'update_mapa_people_record') {
      return (publicSupabase as any).rpc('workspace_update_mapa_people_record', args, options);
    }
    return (workspaceRpc as any)(fn, args, options);
  };
}

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
