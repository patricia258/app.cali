import { supabase } from '../supabase';

export type ProfileMedia = {
  id?: string | null;
  full_name?: string;
  role?: string | null;
  company_id?: string | null;
  avatar_url?: string;
  avatar_position_x?: number;
  avatar_position_y?: number;
  avatar_zoom?: number;
};

export type CompanyMedia = {
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
};

let companySubscriptionId = 0;

export async function readVisibleCompanyMedia(signal: AbortSignal) {
  if (!supabase) return null;
  const { data } = await supabase.from('companies').select('display_name,logo_url,logo_workspace_url')
    .order('display_name').abortSignal(signal);
  return (data || []) as CompanyMedia[];
}

export async function readVisibleProfileMedia(signal: AbortSignal) {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles')
    .select('id,full_name,role,company_id,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom')
    .eq('active', true).abortSignal(signal);
  return (data || []) as ProfileMedia[];
}

export async function readClientContactMedia(signal: AbortSignal) {
  const result = await supabase?.rpc('get_client_account_contact').abortSignal(signal);
  const data = result?.data;
  return (Array.isArray(data) ? data[0] : data) as ProfileMedia | null | undefined;
}

export function observeCompanyIdentityChanges(listener: () => void) {
  const client = supabase;
  if (!client) return () => {};
  const channel = client.channel(`company-workspace-identity-v39-${++companySubscriptionId}`)
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'companies' }, listener)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
