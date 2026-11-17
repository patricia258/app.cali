import type { JsonObject } from '../../domain/json';
import { recordsAvailable, requireRecordsClient } from './client';

const recordColumns = 'id,company_id,project_id,event_id,protocol,record_type,title,occurred_at,visibility,source_actor,participants,summary,transcript,decisions,attention_points,next_actions,impact_level,include_in_report,requires_action,created_by,created_at,workflow_status,last_activity_at,closed_at';

export async function readRecordContext(companyId: string, partner: boolean) {
  const client = requireRecordsClient();
  const records = client.from('account_records').select(recordColumns);
  const messages = client.from('account_record_messages').select('id,record_id').is('deleted_at', null);
  const reopen = client.from('account_record_reopen_requests').select('record_id,status,requested_at').eq('status', 'pending');
  if (companyId !== 'all') {
    records.eq('company_id', companyId);
    messages.eq('company_id', companyId);
    reopen.eq('company_id', companyId);
  }
  if (partner) records.eq('visibility', 'client').not('workflow_status', 'is', null);
  const [recordResult, messageResult, reopenResult] = await Promise.all([
    records.order('last_activity_at', { ascending: false, nullsFirst: false }).order('occurred_at', { ascending: false }),
    messages,
    reopen.order('requested_at', { ascending: false }),
  ]);
  const error = recordResult.error ?? messageResult.error ?? reopenResult.error;
  if (error) throw error;
  const counts: Record<string, number> = {};
  const pendingReopens: Record<string, 'pending'> = {};
  for (const row of messageResult.data ?? []) counts[row.record_id] = (counts[row.record_id] ?? 0) + 1;
  for (const row of reopenResult.data ?? []) pendingReopens[row.record_id] = 'pending';
  return { records: recordResult.data ?? [], counts, pendingReopens };
}

export async function readRecordEditorReferences(companyId: string) {
  const client = requireRecordsClient();
  const projects = client.from('projects').select('id,company_id,name').neq('status', 'cancelled');
  const events = client.from('events').select('id,company_id,title,starts_at,event_type,cancelled_at').is('cancelled_at', null);
  if (companyId !== 'all') {
    projects.eq('company_id', companyId);
    events.eq('company_id', companyId);
  }
  const [projectResult, eventResult] = await Promise.all([
    projects.order('name'), events.order('starts_at', { ascending: false }),
  ]);
  const error = projectResult.error ?? eventResult.error;
  if (error) throw error;
  return {
    projects: (projectResult.data ?? []).map((row) => ({ id: row.id, companyId: row.company_id, name: row.name })),
    events: (eventResult.data ?? []).map((row) => ({
      id: row.id, companyId: row.company_id, title: row.title, startsAt: row.starts_at,
      type: row.event_type, cancelledAt: row.cancelled_at,
    })),
  };
}

export async function readRecordCompanies() {
  const { data, error } = await requireRecordsClient().from('companies').select('id,display_name,logo_url,logo_workspace_url')
    .neq('status', 'archived').order('display_name');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.display_name, logo: row.logo_workspace_url, logoFallback: row.logo_url }));
}

type RecordAuthor = { id: string; full_name: string | null; avatar_url?: string | null };

export async function readRecordAuthors(partner: boolean): Promise<RecordAuthor[] | null> {
  const client = requireRecordsClient();
  if (partner) {
    const [authors, contacts] = await Promise.all([
      client.from('profiles').select('id,full_name,avatar_url'), client.rpc('staff_admin_contacts'),
    ]);
    return authors.error ? null : [...(authors.data ?? []), ...(contacts.data ?? [])];
  }
  const { data, error } = await client.from('profiles').select('id,full_name');
  return error ? null : data;
}

export async function readPendingRecordClosures() {
  const { data } = await requireRecordsClient().from('staff_review_requests').select('entity_id').eq('kind', 'record_close').eq('status', 'pending');
  return Object.fromEntries((data ?? []).map((row) => [row.entity_id, true]));
}

export async function readClientRecordCompany(userId: string) {
  const { data, error } = await requireRecordsClient().from('profiles').select('company_id').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.company_id ?? '';
}

export async function readRecord(recordId: string) {
  return await requireRecordsClient().from('account_records').select(recordColumns).eq('id', recordId).maybeSingle();
}

export async function checkRecordExists(recordId: string) {
  const { data, error } = await requireRecordsClient().from('account_records').select('id').eq('id', recordId).maybeSingle();
  return !error && !data ? false : true;
}

export async function readRecordIdentity(protocol: string) {
  return await requireRecordsClient().from('account_records').select('id,company_id').eq('protocol', protocol).maybeSingle();
}

export function subscribeWorkspaceRecords(companyId: string, role: string, onInsert: () => void, onUpdate: (row: JsonObject) => void) {
  if (!recordsAvailable) return () => {};
  const client = requireRecordsClient();
  const filter = companyId === 'all' ? {} : { filter: `company_id=eq.${companyId}` };
  const channel = client.channel(`records-v27-${companyId}-${role}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'account_records', ...filter }, onInsert)
    .on('postgres_changes', { event: 'UPDATE', schema: 'cali_workspace', table: 'account_records', ...filter }, (payload) => onUpdate(payload.new))
    .subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function readRecordAuthor() {
  return await requireRecordsClient().auth.getUser();
}

export async function insertRecord(payload: JsonObject) {
  return await requireRecordsClient().from('account_records').insert(payload).select('id').single();
}

export async function updateRecord(recordId: string, payload: JsonObject) {
  return await requireRecordsClient().from('account_records').update(payload).eq('id', recordId).select('id').single();
}

export async function deleteInternalRecord(recordId: string) {
  return await requireRecordsClient().from('account_records').delete().eq('id', recordId);
}

export async function notifyRecordShared(companyId: string, actorId: string | null, recordId: string, title: string) {
  return await requireRecordsClient().rpc('notify_workspace_movement', {
    p_company_id: companyId, p_actor_id: actorId, p_target: 'client', p_notification_type: 'account_record_shared',
    p_title: 'Novo registro compartilhado pela CALI', p_body: title, p_entity_type: 'account_record', p_entity_id: recordId,
    p_action_url: `/cliente/registros?record=${recordId}`, p_relevance: 'normal', p_email_required: false,
  });
}

export async function changeRecordStatus(recordId: string, status: string, partner: boolean) {
  return await requireRecordsClient().rpc(partner ? 'partner_set_record_status' : 'set_account_record_status', { p_record_id: recordId, p_status: status });
}

export async function requestPartnerRecordClose(recordId: string) {
  return await requireRecordsClient().rpc('partner_request_record_close', { p_record_id: recordId, p_note: null });
}

export async function readPartnerRecordTimer(recordId: string, userId: string) {
  const { data } = await requireRecordsClient().from('work_timers').select('id,started_at')
    .eq('user_id', userId).eq('account_record_id', recordId).eq('status', 'active').limit(1);
  const row = data?.[0];
  return row ? { id: row.id as string, startedAt: row.started_at as string } : null;
}

export async function startPartnerRecordTimer(recordId: string) {
  return await requireRecordsClient().rpc('partner_start_record_timer', { p_record_id: recordId });
}

export async function stopPartnerRecordTimer(timerId: string) {
  return await requireRecordsClient().rpc('partner_stop_timer', { p_timer_id: timerId, p_description: null });
}
