import { requireProjectClient } from './client';

export async function readProjectActor() {
  return await requireProjectClient().auth.getUser();
}

export async function readProjectViewerId() {
  const { data } = await requireProjectClient().auth.getSession();
  return data.session?.user?.id ?? '';
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
    : await client.from('profiles').select('id,full_name,avatar_url').eq('role', 'admin');
  return [...(team.data ?? []), ...(admins.data ?? [])] as { id: string; full_name?: string; avatar_url?: string }[];
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

const identityColumns = 'id,full_name,role,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom';

export async function readDeliverableConversationIdentities(role: 'admin' | 'client', companyId: string) {
  const client = requireProjectClient();
  const userId = await readProjectViewerId();
  const viewer = userId ? (await client.from('profiles').select(identityColumns).eq('id', userId).maybeSingle()).data : null;
  let staff = [];
  try {
    const result = await client.rpc('staff_identities');
    staff = result.data ?? [];
  } catch {
    // Os nomes padrão continuam disponíveis se as identidades da equipe falharem.
  }
  const clients = role === 'admin' || viewer?.role === 'admin'
    ? (await client.from('profiles').select(identityColumns).eq('company_id', companyId).eq('role', 'client').eq('active', true)).data ?? []
    : [];
  const contact = role === 'client' && viewer?.role === 'client' ? (await client.rpc('get_client_account_contact')).data : null;
  return { viewer, staff, clients, contact: Array.isArray(contact) ? contact[0] : contact };
}

export async function readDeliverableConversationIdentity(protocol: string) {
  const { data } = await requireProjectClient().from('deliverables').select('id,company_id,project_id,protocol').eq('protocol', protocol).maybeSingle();
  return data;
}

export async function readDeliverableConversation(deliverableId: string, visible: boolean) {
  return await requireProjectClient().from('comments').select('id,company_id,target_id,author_user_id,body,client_visible,source_actor,created_at')
    .eq('target_type', 'deliverable').eq('target_id', deliverableId).eq('client_visible', visible).order('created_at');
}

export async function postClientDeliverableComment(deliverableId: string, body: string) {
  return await requireProjectClient().rpc('client_submit_deliverable_comment', { p_deliverable_id: deliverableId, p_body: body });
}

export async function removeDeliverableAttachment(path: string) {
  return await requireProjectClient().storage.from('cali-workspace-private').remove([path]);
}

export function subscribeDeliverableConversation(deliverableId: string, refresh: () => void) {
  const client = requireProjectClient();
  const channel = client.channel(`deliverable-chat-v35-${deliverableId}-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'comments', filter: `target_id=eq.${deliverableId}` }, refresh)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
