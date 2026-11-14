import { supabase } from '../supabase';

export type ProfileMedia = {
  id?: string | null;
  full_name?: string;
  role?: string | null;
  company_id?: string | null;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};

export const profileAvatarColumns = 'id,full_name,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom';

let companySubscriptionId = 0;

export function observeCompanyIdentityChanges(listener: () => void) {
  const client = supabase;
  if (!client) return () => {};
  const channel = client.channel(`company-workspace-identity-v39-${++companySubscriptionId}`)
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'companies' }, listener)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
