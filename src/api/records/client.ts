import { supabase } from '../supabase';

export const recordsAvailable = supabase !== null;

export function requireRecordsClient() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export async function readRecordViewerId() {
  const { data } = await requireRecordsClient().auth.getSession();
  return data.session?.user?.id ?? '';
}
