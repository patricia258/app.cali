import { supabase } from '../supabase';

export async function hasSeenWorkspaceWelcome(userId: string) {
  const result = await supabase?.from('welcome_views').select('user_id').eq('user_id', userId).limit(1);
  return Boolean(result && !result.error && result.data?.length);
}

export async function markWorkspaceWelcomeSeen(userId: string) {
  await supabase?.from('welcome_views').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
}
