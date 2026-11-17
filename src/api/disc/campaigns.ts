import { z } from 'zod';
import { supabase } from '../supabase';

const linkColumns = 'id,slug,title,company_id,company_label,purpose,status,created_at';
const nullableText = z.string().nullish().transform((value) => value ?? null);
const linkSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), company_id: nullableText, company_label: nullableText,
  purpose: z.string(), status: z.enum(['open', 'closed']), created_at: z.string(),
});
export type DiscLink = z.infer<typeof linkSchema>;

const unavailable = { message: 'Conexão indisponível.' };

export async function readDiscCatalog() {
  if (!supabase) return { links: [], results: [], companies: [], error: unavailable };
  const [links, results, companies] = await Promise.all([
    supabase.from('profile_links').select(linkColumns).order('created_at', { ascending: false }),
    supabase.from('profile_results')
      .select('id,link_id,invite_id,company_id,company_name,team_member_id,person_name,email,job_title,primary_style,secondary_style,mixed,scores,created_at,report_path,report_emailed_at')
      .order('created_at', { ascending: false }).limit(5000),
    supabase.from('companies').select('id,display_name,status').order('display_name'),
  ]);
  return {
    links: z.array(linkSchema).safeParse(links.data ?? []).data ?? [],
    results: results.data ?? [],
    companies: (companies.data ?? []).filter((row) => row.status !== 'archived').map((row) => ({ id: row.id, name: row.display_name })),
    error: links.error ?? results.error,
  };
}

export async function saveDiscLink(id: string | undefined, fields: Omit<DiscLink, 'id' | 'created_at'>) {
  if (!supabase) return { data: null, error: unavailable };
  const request = id ? supabase.from('profile_links').update(fields).eq('id', id) : supabase.from('profile_links').insert(fields);
  const result = await request.select(linkColumns).single();
  if (result.error) return { data: null, error: result.error };
  const parsed = linkSchema.safeParse(result.data);
  return parsed.success ? { data: parsed.data, error: null } : { data: null, error: { message: 'O cadastro retornou dados inválidos.' } };
}

export async function changeDiscLinkStatus(id: string, status: DiscLink['status']) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('profile_links').update({ status }).eq('id', id);
}

export async function readDiscCampaign(id: string) {
  if (!supabase) return null;
  const { data: link } = await supabase.from('profile_links')
    .select('id,slug,title,company_id,company_label,purpose,status,deadline_days,deadline_log,focal_name,focal_email')
    .eq('id', id).maybeSingle();
  if (!link) return null;
  const [invites, company, members] = await Promise.all([
    supabase.from('profile_invite_status').select('*').eq('link_id', id).order('created_at'),
    link.company_id ? supabase.from('companies').select('display_name').eq('id', link.company_id).maybeSingle() : { data: null },
    link.company_id ? supabase.from('team_members').select('id,full_name,work_email').eq('company_id', link.company_id).is('archived_at', null).order('full_name') : { data: [] },
  ]);
  return { link, invites, company: company.data?.display_name, members: members.data ?? [] };
}

export async function saveCampaignSettings(id: string, settings: { deadline_days: number; focal_name: string; focal_email: string }) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('profile_links').update({
    deadline_days: settings.deadline_days,
    focal_name: settings.focal_name.trim() || null, focal_email: settings.focal_email.trim().toLowerCase() || null,
  }).eq('id', id);
}

type InvitePerson = { person_name: string; email: string; team_member_id?: string | null };

export async function queueDiscInvites(linkId: string, people: InvitePerson[]) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('profile_invites').insert(people.map((person) => ({ link_id: linkId, ...person })));
}

export async function addDiscInviteCycle(linkId: string, person: InvitePerson, cycle: number) {
  if (!supabase) return { data: null, error: unavailable };
  return await supabase.from('profile_invites').insert({ link_id: linkId, ...person, cycle }).select('id').single();
}

export async function deliverDiscInvites(linkId: string, ids?: string[]) {
  if (!supabase) return { data: null, error: unavailable };
  return await supabase.rpc('profile_send_invites', ids ? { p_link: linkId, p_ids: ids } : { p_link: linkId });
}

export async function removeQueuedDiscInvite(id: string) {
  if (!supabase) return { error: unavailable };
  return await supabase.from('profile_invites').delete().eq('id', id);
}

export async function renewDiscInvite(id: string) {
  if (!supabase) return { error: unavailable };
  return await supabase.rpc('profile_renew_invite', { p_invite: id });
}

export async function extendDiscCampaignDeadline(id: string, date: string, reason: string) {
  if (!supabase) return { data: null, error: unavailable };
  return await supabase.rpc('profile_extend_deadline', { p_link: id, p_until: `${date}T23:59:00-03:00`, p_reason: reason.trim() });
}

export async function readDiscInviteHistory(email: string) {
  if (!supabase) return [];
  const result = await supabase.from('profile_invite_status')
    .select('id,link_id,cycle,state,sent_at,deadline_at,completed_at').ilike('email', email).order('created_at', { ascending: false });
  return result.data ?? [];
}
