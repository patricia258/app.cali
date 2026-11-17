import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '../supabase';
import { accessKeys } from './query-keys';

const workspaceRole = z.enum(['admin', 'client', 'partner']);
const workspaceProfile = z.object({
  role: workspaceRole,
  active: z.boolean(),
});

export type WorkspaceRole = z.infer<typeof workspaceRole>;

export async function readWorkspaceProfile(userId: string, signal?: AbortSignal) {
  if (!supabase) throw new Error('Supabase não configurado.');

  const query = supabase.from('profiles').select('role, active').eq('id', userId);
  if (signal) query.abortSignal(signal);
  const { data, error } = await query.single();

  if (error) throw error;
  return workspaceProfile.parse(data);
}

export function workspaceProfileQuery(userId: string) {
  return queryOptions({
    queryKey: accessKeys.profile(userId),
    queryFn: ({ signal }) => readWorkspaceProfile(userId, signal),
    staleTime: 0,
    networkMode: 'always',
  });
}
