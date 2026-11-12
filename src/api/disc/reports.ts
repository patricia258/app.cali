import { z } from 'zod';
import { anonPublicRpc, supabase } from '../supabase';

const unavailable = { message: 'Conexão indisponível.' };
const resultFields = 'id,person_name,email,company_id,company_name,job_title,purpose,created_at,scores,primary_style,secondary_style,mixed,method_version,role_profile,team_member_id,report_path,companies(display_name),protocol';

export async function signRespondentReport(path: string) {
  if (!supabase) return null;
  const result = await supabase.storage.from('cali-profiles').createSignedUrl(path, 600);
  return result.data?.signedUrl ?? null;
}

export async function downloadRespondentReport(path: string) {
  if (!supabase) return { data: null, error: unavailable };
  return await supabase.storage.from('cali-profiles').download(path);
}

export async function deleteDiscResult(id: string, path: string | null) {
  if (!supabase) return { error: unavailable };
  if (path) await supabase.storage.from('cali-profiles').remove([path]);
  return await supabase.from('profile_results').delete().eq('id', id);
}

export async function readEvaluatorResult(id: string) {
  if (!supabase) return null;
  const result = await supabase.from('profile_results').select(resultFields).eq('id', id).maybeSingle();
  return result.data;
}

export async function readEvaluatorCompanyContext(companyId: string) {
  if (!supabase) return { styles: [], members: [] };
  const [styles, members] = await Promise.all([
    supabase.from('profile_results').select('primary_style').eq('company_id', companyId),
    supabase.from('team_members').select('id,full_name,work_email').eq('company_id', companyId).is('archived_at', null).order('full_name'),
  ]);
  return { styles: styles.data ?? [], members: members.data ?? [] };
}

export async function readEvaluatorReference() {
  const result = await supabase?.schema('public').rpc('cali_profile_base');
  return result?.data ?? null;
}

export async function readDiscSigner() {
  const result = await anonPublicRpc('cali_profile_signer', {});
  return result.data;
}

export async function updateEvaluatorResult(id: string, fields: { team_member_id?: string | null; role_profile?: unknown }) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('profile_results').update(fields).eq('id', id);
}

export async function readMemberDiscHistory(memberId: string) {
  if (!supabase) return [];
  const result = await supabase.from('profile_results').select('id,created_at,primary_style,secondary_style,mixed,scores')
    .eq('team_member_id', memberId).order('created_at', { ascending: false });
  return result.data ?? [];
}

export async function readManagementDiscCatalog() {
  if (!supabase) return [];
  const result = await supabase.rpc('profile_gestao_list');
  const row = z.object({ id: z.string(), title: z.string(), released_at: z.string() });
  return z.array(row).safeParse(result.data).data ?? [];
}

export async function readManagementDiscReport(id: string) {
  const result = await supabase?.rpc('profile_gestao', { p_link: id });
  return result?.data ?? null;
}

export async function saveManagementDiscContext(id: string, fields: { moment: string; sector: string; goal: string; note: string }) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('profile_links').update({
    gestao_moment: fields.moment || null, gestao_sector: fields.sector || null,
    gestao_goal: fields.goal.trim() || null, gestao_note: fields.note.trim() || null,
  }).eq('id', id);
}

export async function changeManagementDiscState(id: string, action: 'approve' | 'release', value: boolean) {
  if (!supabase) return { error: unavailable };
  return action === 'approve'
    ? await supabase.rpc('profile_gestao_approve', { p_link: id, p_approve: value })
    : await supabase.rpc('profile_gestao_release', { p_link: id, p_release: value });
}

export async function sendManagementDiscPdf(
  id: string, recipient: { name: string; email: string }, path: string, blob: Blob,
) {
  if (!supabase) throw new Error(unavailable.message);
  const upload = await supabase.storage.from('cali-profiles').upload(path, blob, { contentType: 'application/pdf', upsert: false });
  if (upload.error) throw upload.error;
  const { error } = await supabase.rpc('profile_gestao_send', {
    p_link: id, p_name: recipient.name.trim(), p_email: recipient.email.trim(), p_path: path,
  });
  if (error) throw error;
}
