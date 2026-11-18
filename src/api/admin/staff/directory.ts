import { z } from 'zod';
import { supabase } from '../../supabase';

const person = z.object({
  id: z.string(), email: z.string(), full_name: z.string(), active: z.boolean(),
  modules: z.array(z.string()).nullish().transform((value) => value ?? []), user_id: z.string().nullish(),
  invited_at: z.string().nullish(), accepted_at: z.string().nullish(),
});
const company = z.object({ id: z.string(), display_name: z.string() });
export type StaffDirectoryPerson = z.infer<typeof person>;
export type StaffDirectoryCompany = z.infer<typeof company>;
export type StaffDraft = { id: string | null; email: string; full_name: string; modules: string[]; companies: string[]; active: boolean };

export async function readStaffAdministration() {
  if (!supabase) throw new Error('Conexão indisponível.');
  const db = supabase;
  const [people, firms, links] = await Promise.all([
    db.from('staff_members').select('id,email,full_name,modules,active,user_id,invited_at,accepted_at').order('full_name'),
    db.from('companies').select('id,display_name').order('display_name'),
    db.from('staff_company_assignments').select('staff_id,company_id'),
  ]);
  const staff = z.array(person).parse(people.data ?? []);
  const companies = z.array(company).parse(firms.data ?? []);
  const assigned: Record<string, string[]> = {};
  for (const link of links.data ?? []) (assigned[link.staff_id] ||= []).push(link.company_id);
  const ids = staff.flatMap((item) => item.user_id ? [item.user_id] : []);
  const [log, hours, reviews] = await Promise.all([
    ids.length ? db.from('activity_log').select('actor_user_id,event_type,created_at').in('actor_user_id', ids)
      .in('event_type', ['workspace_access_code_verified', 'staff_session_started', 'staff_session_ended'])
      .order('created_at', { ascending: false }).limit(400) : null,
    db.from('staff_hour_submissions').select('id,staff_user_id,company_id,work_date,minutes,description,justification,created_at').eq('status', 'pending').order('created_at'),
    db.from('staff_review_requests').select('id,staff_user_id,company_id,kind,entity_id,title,note,payload,created_at').eq('status', 'pending').order('created_at'),
  ]);
  const sessions: Record<string, { in?: string; out?: string }> = {};
  for (const row of log?.data ?? []) {
    const entry = (sessions[row.actor_user_id] ||= {});
    if (row.event_type === 'staff_session_ended') entry.out ||= row.created_at;
    else entry.in ||= row.created_at;
  }
  return {
    directory: people.error || firms.error || links.error ? null : { staff, companies, assigned },
    sessions,
    hours: hours.data ?? [],
    reviews: reviews.data ?? [],
  };
}

export async function saveStaffDirectoryPerson(draft: StaffDraft, previousCompanies: string[]) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const db = supabase;
  const { data: session } = await db.auth.getUser();
  let id = draft.id;
  if (id) {
    const result = await db.from('staff_members').update({
      full_name: draft.full_name, modules: draft.modules, active: draft.active, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (result.error) throw result.error;
  } else {
    const result = await db.from('staff_members').insert({
      email: draft.email, full_name: draft.full_name, modules: draft.modules, active: true, invited_by: session.user?.id || null,
    }).select('id').single();
    if (result.error) throw result.error;
    id = z.string().parse(result.data.id);
  }
  const added = draft.companies.filter((companyId) => !previousCompanies.includes(companyId));
  const removed = previousCompanies.filter((companyId) => !draft.companies.includes(companyId));
  if (added.length) {
    const result = await db.from('staff_company_assignments').insert(added.map((companyId) => ({ staff_id: id, company_id: companyId })));
    if (result.error) throw result.error;
  }
  if (removed.length) {
    const result = await db.from('staff_company_assignments').delete().eq('staff_id', id).in('company_id', removed);
    if (result.error) throw result.error;
  }
  return id;
}

export async function sendStaffInvite(id: string) {
  if (!supabase) return false;
  const result = await supabase.functions.invoke('workspace-staff-invite', { body: { staffId: id } });
  return !result.error && z.object({ ok: z.literal(true) }).safeParse(result.data).success;
}
