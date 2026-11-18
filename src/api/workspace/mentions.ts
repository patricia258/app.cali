import { supabase } from '../supabase';

export type MentionCandidate = { id: string; full_name: string; label: string };

export async function listMentionCandidates(signal: AbortSignal) {
  const result = await supabase?.rpc('mention_candidates').abortSignal(signal);
  if (!result || result.error) return null;
  return ((result.data || []) as MentionCandidate[]).sort((first, second) => first.full_name.localeCompare(second.full_name, 'pt-BR'));
}
