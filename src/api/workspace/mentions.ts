import { supabase } from '../supabase';

export type MentionCandidate = { id: string; full_name: string; label: string };

export async function listMentionCandidates() {
  const result = await supabase?.rpc('mention_candidates');
  if (!result || result.error) return null;
  return (result.data || []) as MentionCandidate[];
}
