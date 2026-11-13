import type { JsonObject } from '../../domain/json';
import { requireProjectClient } from './client';
import { profileAvatarColumns, type ProfileMedia } from '../workspace/identity';

export async function readDeliverableTasks(deliverableId: string) {
  return await requireProjectClient().from('deliverable_tasks').select('*').eq('deliverable_id', deliverableId).order('sort_order');
}

export async function addDeliverableTask(row: JsonObject) {
  return await requireProjectClient().from('deliverable_tasks').insert(row);
}

export async function addPartnerDeliverableTask(input: {
  p_deliverable_id: string; p_title: string; p_description: string | null; p_due_at: string | null;
  p_estimated_minutes: number; p_client_visible: boolean; p_complexity: string; p_is_document: boolean;
}) {
  return await requireProjectClient().rpc('partner_create_task', input);
}

export async function changeDeliverableTaskStatus(id: string, status: string, partner = false) {
  if (partner) return await requireProjectClient().rpc('partner_set_task_status', { p_task_id: id, p_status: status });
  const completed = status === 'done' || status === 'approved';
  return await requireProjectClient().from('deliverable_tasks').update({ status, completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
}

export async function readClientTaskContext(taskId: string) {
  const client = requireProjectClient();
  const [thread, files, adjustments] = await Promise.all([
    client.from('task_messages').select('id,author_user_id,author_role,body,created_at')
      .eq('task_id', taskId).eq('client_visible', true).order('created_at'),
    client.from('files').select('id,title,storage_path,original_filename')
      .eq('task_id', taskId).eq('client_visible', true).eq('status', 'published'),
    client.from('deliverable_tasks').select('adjustment_count').eq('id', taskId).maybeSingle(),
  ]);
  return { thread, files, adjustments };
}

export async function readClientTaskParticipants(userId: string) {
  const client = requireProjectClient();
  const [{ data: staff }, { data: contact }, { data: viewer }] = await Promise.all([
    client.rpc('staff_identities'),
    client.rpc('get_client_account_contact'),
    userId
      ? client.from('profiles').select(`${profileAvatarColumns},company_id`).eq('id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const admin = Array.isArray(contact) ? contact[0] : contact;
  const people: ProfileMedia[] = [...(staff ?? []), admin, viewer].filter(Boolean);
  return {
    companyId: (viewer?.company_id ?? '') as string,
    people: Object.fromEntries(people.flatMap((person) => person.id ? [[person.id, person]] : [])),
  };
}

export async function postClientTaskMessage(taskId: string, body: string) {
  return await requireProjectClient().rpc('client_post_task_message', { p_task_id: taskId, p_body: body });
}

export async function approveClientTask(taskId: string) {
  return await requireProjectClient().rpc('client_approve_task', { p_task_id: taskId });
}

export async function requestClientTaskAdjustment(taskId: string, body: string) {
  return await requireProjectClient().rpc('client_request_task_adjustment', { p_task_id: taskId, p_body: body });
}
