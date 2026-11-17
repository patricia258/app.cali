import { requireProjectClient } from './client';

export async function readProjectNotes(deliverableId: string, taskId?: string | null) {
  const query = requireProjectClient().from('note_entries').select('id,author_user_id,author_name,body,created_at')
    .eq('deliverable_id', deliverableId).order('created_at', { ascending: false });
  return await (taskId ? query.eq('task_id', taskId) : query.is('task_id', null));
}

export async function addProjectNote(companyId: string, deliverableId: string, taskId: string | null, text: string, partner: boolean) {
  const client = requireProjectClient();
  const body = text.trim();
  if (partner) return await client.rpc('partner_add_note', { p_deliverable_id: deliverableId, p_task_id: taskId, p_body: body });
  const { data: auth } = await client.auth.getUser();
  const userId = auth.user?.id ?? null;
  const profile = userId ? await client.from('profiles').select('full_name').eq('id', userId).maybeSingle() : null;
  return await client.from('note_entries').insert({
    deliverable_id: deliverableId, task_id: taskId, company_id: companyId,
    author_user_id: userId, author_name: profile?.data?.full_name || 'Patrícia Lima', body,
  });
}

export async function editProjectNote(id: string, body: string, partner: boolean) {
  const client = requireProjectClient();
  if (partner) return await client.rpc('partner_edit_note', { p_note_id: id, p_body: body });
  return await client.from('note_entries').update({ body: body.trim() }).eq('id', id);
}

export async function deleteProjectNote(id: string, partner: boolean) {
  const client = requireProjectClient();
  if (partner) return await client.rpc('partner_delete_note', { p_note_id: id });
  return await client.from('note_entries').delete().eq('id', id);
}
