import { supabase } from '../supabase';

export function requireProjectClient() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}
