import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '../supabase';

const workspaceRole = z.enum(['admin', 'client', 'partner']);
const workspaceProfile = z.object({
  role: workspaceRole,
  active: z.boolean(),
});

export type WorkspaceRole = z.infer<typeof workspaceRole>;

export const workspaceProfileKey = (userId: string) => ['workspace-auth', 'profile', userId] as const;

async function readWorkspaceProfile(userId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return workspaceProfile.parse(data);
}

export function workspaceProfileQuery(userId: string) {
  return queryOptions({
    queryKey: workspaceProfileKey(userId),
    queryFn: ({ signal }) => readWorkspaceProfile(userId, signal),
    staleTime: 0,
    networkMode: 'always',
  });
}
