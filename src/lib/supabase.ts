import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const fallbackPublishableKey = 'sb_publishable_rhIy864X0VSQ0B7m7gdmCQ_hX3sKFMg';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || fallbackUrl;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || fallbackPublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      db: {
        schema: 'cali_workspace',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
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
