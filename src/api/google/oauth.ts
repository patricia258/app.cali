import { z } from 'zod';
import { supabase } from '../supabase';
import { readAuthenticatedWorkspaceProfile } from '../access/session';

const exchangeResponse = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  accountEmail: z.string().nullish(),
});

export async function exchangeGoogleCode(integration: 'drive' | 'calendar', code: string, state: string) {
  if (!supabase) return { kind: 'unavailable' } as const;
  const name = integration === 'drive' ? 'google-drive-oauth' : 'google-calendar-oauth';
  const payload = { body: { action: 'exchange', code, state } };
  let result = await supabase.functions.invoke(name, payload);
  if (result.error?.name === 'FunctionsFetchError') result = await supabase.functions.invoke(name, payload);
  const response = exchangeResponse.safeParse(result.data);
  if (result.error || !response.success || response.data.error || response.data.ok === false) {
    return { kind: 'error' } as const;
  }

  const profile = await readAuthenticatedWorkspaceProfile();
  if (!profile?.active || profile.role === 'partner') return { kind: 'unavailable' } as const;
  return { kind: 'connected', role: profile.role, accountEmail: response.data.accountEmail } as const;
}
