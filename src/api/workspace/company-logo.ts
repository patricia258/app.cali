import { supabase } from '../supabase';

export type CompanyLogoRecord = {
  id: string;
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
  logo_workspace_generated_at?: string | null;
  status?: string | null;
};

const companyLogoFields = 'id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status';

export async function readCompanyLogoForGeneration(id: string, signal: AbortSignal) {
  const result = await supabase?.from('companies').select(companyLogoFields)
    .eq('id', id).abortSignal(signal).maybeSingle();
  return (result?.data ?? null) as CompanyLogoRecord | null;
}

export async function listCompaniesWithoutWorkspaceLogo(limit: number, signal: AbortSignal) {
  const result = await supabase?.from('companies').select(companyLogoFields)
    .not('logo_url', 'is', null).is('logo_workspace_url', null)
    .order('updated_at', { ascending: false }).limit(limit).abortSignal(signal);
  return result?.error ? [] : (result?.data || []) as CompanyLogoRecord[];
}

export async function saveCompanyWorkspaceLogo(id: string, path: string, blob: Blob, signal: AbortSignal) {
  if (!supabase || signal.aborted) return '';
  const { error: uploadError } = await supabase.storage.from('cali-workspace-private')
    .upload(path, blob, { contentType: 'image/png', upsert: false });
  if (signal.aborted) return '';
  if (uploadError) throw uploadError;

  const stored = `private:${path}`;
  const { error: updateError } = await supabase.from('companies').update({
    logo_workspace_url: stored, logo_workspace_generated_at: new Date().toISOString(),
  }).eq('id', id).abortSignal(signal);
  if (signal.aborted) return '';
  if (updateError) throw updateError;
  return stored;
}
