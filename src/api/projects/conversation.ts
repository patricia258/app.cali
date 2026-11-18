import { requireProjectClient } from './client';
import { profileAvatarColumns, type ProfileMedia } from '../workspace/identity';

export async function readProjectActor() {
  return await requireProjectClient().auth.getUser();
}

export async function readPartnerDeliverableConversation(deliverableId: string, visible: boolean) {
  return await requireProjectClient().from('comments').select('id,body,author_user_id,source_actor,created_at')
    .eq('target_type', 'deliverable').eq('target_id', deliverableId).eq('client_visible', visible).order('created_at');
}

export async function postPartnerDeliverableComment(deliverableId: string, body: string, visible: boolean) {
  return await requireProjectClient().rpc('partner_post_deliverable_comment', { p_deliverable_id: deliverableId, p_body: body, p_client_visible: visible });
}

export async function postAdminDeliverableComment(companyId: string, deliverableId: string, actorId: string | null, body: string, visible: boolean, sourceActor?: 'admin') {
  return await requireProjectClient().from('comments').insert({
    company_id: companyId, target_type: 'deliverable', target_id: deliverableId,
    author_user_id: actorId, body, client_visible: visible, ...(sourceActor && { source_actor: sourceActor }),
  });
}

export async function uploadDeliverableAttachment(path: string, blob: Blob, contentType: string, cacheControl?: string) {
  return await requireProjectClient().storage.from('cali-workspace-private').upload(path, blob, {
    contentType, ...(cacheControl ? { cacheControl } : { upsert: false }),
  });
}

export async function readTaskMessages(taskId: string) {
  return await requireProjectClient().from('task_messages').select('id,author_user_id,author_role,body,created_at,client_visible')
    .eq('task_id', taskId).order('created_at');
}

export async function readTaskConversationPeople(partner: boolean) {
  const client = requireProjectClient();
  const team = await client.rpc('staff_identities');
  const admins = partner ? await client.rpc('staff_admin_contacts')
    : await client.from('profiles').select(profileAvatarColumns).eq('role', 'admin');
  const people: ProfileMedia[] = [...(team.data ?? []), ...(admins.data ?? [])];
  return people;
}

export async function postTaskMessage(input: {
  taskId: string; deliverableId: string; companyId: string; actorId: string | null;
  body: string; visible: boolean; partner: boolean;
}) {
  const client = requireProjectClient();
  if (input.partner) {
    return await client.rpc('partner_post_task_message', { p_task_id: input.taskId, p_body: input.body, p_client_visible: input.visible });
  }
  return await client.from('task_messages').insert({
    task_id: input.taskId, deliverable_id: input.deliverableId, company_id: input.companyId,
    author_user_id: input.actorId, author_role: 'admin', body: input.body, client_visible: input.visible,
  });
}

const identityColumns = `${profileAvatarColumns},role`;

export type DeliverableConversationIdentity = {
  id?: string | null;
  full_name: string;
  role?: string | null;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};

export async function readDeliverableConversationIdentities(role: 'admin' | 'client', companyId: string, actorId: string, signal: AbortSignal) {
  const client = requireProjectClient();
  const [viewer, staff, participants] = await Promise.all([
    client.from('profiles').select(identityColumns).eq('id', actorId).abortSignal(signal).maybeSingle(),
    client.rpc('staff_identities').abortSignal(signal),
    role === 'admin'
      ? client.from('profiles').select(identityColumns).eq('company_id', companyId).eq('role', 'client').eq('active', true).abortSignal(signal)
      : client.rpc('get_client_account_contact').abortSignal(signal),
  ]);
  const people = (Array.isArray(participants.data) ? participants.data : participants.data ? [participants.data] : []) as DeliverableConversationIdentity[];
  return {
    viewer: viewer.data as DeliverableConversationIdentity | null,
    staff: (staff.data ?? []) as DeliverableConversationIdentity[],
    clients: role === 'admin' ? people : [],
    contact: role === 'client' ? people[0] ?? null : null,
  };
}

export type DeliverableConversationMessage = {
  id: string;
  author_user_id: string | null;
  body: string;
  source_actor: 'admin' | 'client' | 'partner' | 'system' | null;
  created_at: string;
};

export async function readDeliverableConversation(companyId: string, deliverableId: string, visible: boolean, signal: AbortSignal) {
  const { data, error } = await requireProjectClient().from('comments').select('id,author_user_id,body,source_actor,created_at')
    .eq('company_id', companyId).eq('target_type', 'deliverable').eq('target_id', deliverableId).eq('client_visible', visible)
    .order('created_at').abortSignal(signal);
  if (error) throw new Error(error.message);
  return (data ?? []) as DeliverableConversationMessage[];
}

export async function readDeliverableConversationCount(companyId: string, deliverableId: string, signal: AbortSignal) {
  const { count, error } = await requireProjectClient().from('comments').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('target_type', 'deliverable').eq('target_id', deliverableId).abortSignal(signal);
  if (error) throw new Error(error.message);
  return count;
}

export async function postClientDeliverableComment(deliverableId: string, body: string) {
  return await requireProjectClient().rpc('client_submit_deliverable_comment', { p_deliverable_id: deliverableId, p_body: body });
}

export async function removeDeliverableAttachment(path: string) {
  return await requireProjectClient().storage.from('cali-workspace-private').remove([path]);
}

export function subscribeDeliverableConversation(deliverableId: string, actorId: string, refresh: (arrivingId?: string) => void) {
  const client = requireProjectClient();
  const channel = client.channel(`deliverable-conversation-${deliverableId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'comments', filter: `target_id=eq.${deliverableId}` }, (payload) => {
      if (payload.eventType !== 'DELETE' && payload.new.target_type !== 'deliverable') return;
      const arrivingId = payload.eventType === 'INSERT' && payload.new.author_user_id !== actorId ? String(payload.new.id ?? '') : undefined;
      refresh(arrivingId);
    })
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
