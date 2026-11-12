import { readRecordViewerId, recordsAvailable, requireRecordsClient } from './client';

export type ConversationMessageRow = {
  id: string;
  record_id: string;
  author_id?: string | null;
  author_role: 'admin' | 'client' | 'system';
  body: string;
  visibility: 'client' | 'internal';
  created_at: string;
  edited_at?: string | null;
};

export type ConversationIdentity = {
  id?: string | null;
  full_name: string;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};

const identityColumns = 'id,full_name,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom';

export async function readConversationIdentities(role: 'admin' | 'client', companyId: string) {
  const client = requireRecordsClient();
  const userId = await readRecordViewerId();
  const self = userId ? await client.from('profiles').select(identityColumns).eq('id', userId).maybeSingle() : null;
  const participants = role === 'admin'
    ? await client.from('profiles').select(identityColumns).eq('company_id', companyId).eq('role', 'client').eq('active', true)
    : await client.rpc('get_client_account_contact');
  let staff: ConversationIdentity[] = [];
  try {
    const result = await client.rpc('staff_identities');
    staff = result.data ?? [];
  } catch {
    // Identidades de apoio são opcionais nesta conversa.
  }
  return {
    viewer: (self?.data ?? null) as ConversationIdentity | null,
    participants: (Array.isArray(participants.data) ? participants.data : participants.data ? [participants.data] : []) as ConversationIdentity[],
    staff,
  };
}

export async function listRecordMessages(recordId: string) {
  return await requireRecordsClient().from('account_record_messages')
    .select('id,record_id,author_id,author_role,body,visibility,created_at,edited_at')
    .eq('record_id', recordId).is('deleted_at', null).order('created_at')
    .returns<ConversationMessageRow[]>();
}

export async function postRecordMessage(recordId: string, body: string, partner = false, internal = false) {
  return await requireRecordsClient().rpc(partner ? 'partner_post_record_message' : 'post_account_record_message', {
    p_record_id: recordId, p_body: body, p_internal: internal,
  });
}

export async function editRecordMessage(messageId: string, body: string) {
  return await requireRecordsClient().rpc('edit_account_record_message', { p_message_id: messageId, p_body: body });
}

export async function deleteRecordMessage(messageId: string) {
  return await requireRecordsClient().rpc('delete_account_record_message', { p_message_id: messageId });
}

export async function uploadRecordAttachment(path: string, file: File) {
  return await requireRecordsClient().storage.from('cali-workspace-private').upload(path, file, { contentType: file.type, upsert: false });
}

export async function removeRecordAttachment(path: string) {
  return await requireRecordsClient().storage.from('cali-workspace-private').remove([path]);
}

export function subscribeRecordMessages(recordId: string, event: 'INSERT' | 'UPDATE', refresh: () => void) {
  if (!recordsAvailable) return () => {};
  const client = requireRecordsClient();
  const filter = `record_id=eq.${recordId}`;
  const channel = client.channel(`record-messages-${event}-${recordId}-${Date.now()}`);
  if (event === 'INSERT') {
    channel.on('postgres_changes', { event, schema: 'cali_workspace', table: 'account_record_messages', filter }, refresh);
  } else {
    channel.on('postgres_changes', { event, schema: 'cali_workspace', table: 'account_record_messages', filter }, refresh);
  }
  channel.subscribe();
  return () => { void client.removeChannel(channel); };
}
