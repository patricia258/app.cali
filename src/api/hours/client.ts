import { supabase } from '../supabase';

export const hoursAvailable = supabase !== null;

export function requireHoursClient() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}
