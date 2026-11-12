import { readSupabaseEnvironment } from './environment';

export const supabaseEnvironment = readSupabaseEnvironment({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  origin: window.location.origin,
  allowProduction: !import.meta.env.DEV,
});
