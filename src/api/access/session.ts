import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../supabase';
import { readWorkspaceProfile } from './profile';

export { isSupabaseConfigured };

export async function readWorkspaceSession() {
  const result = await supabase?.auth.getSession();
  return result?.error ? null : result?.data.session ?? null;
}

export function observeWorkspaceSession(listener: (session: Session | null) => void) {
  const result = supabase?.auth.onAuthStateChange((_event, session) => listener(session));
  return () => result?.data.subscription.unsubscribe();
}

export async function endWorkspaceSession() {
  await supabase?.auth.signOut();
}

export async function readExistingWorkspaceRole() {
  const session = await readWorkspaceSession();
  if (!session) return null;
  const profile = await readWorkspaceProfile(session.user.id).catch(() => null);
  return profile?.active ? profile.role : null;
}

export async function readAuthenticatedWorkspaceProfile() {
  const result = await supabase?.auth.getUser();
  if (!result?.data.user) return null;
  return readWorkspaceProfile(result.data.user.id).catch(() => null);
}

export async function verifyLegacyAccessLink(token: string, type: 'email' | 'magiclink') {
  const result = await supabase?.auth.verifyOtp({ token_hash: token, type });
  return Boolean(result && !result.error);
}
