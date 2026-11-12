import type { ReportAgendaCompliance } from '../../domain/calendar';
import { supabase } from '../supabase';

function requireMeetingClient() {
  if (!supabase) throw new Error('Supabase indisponível.');
  return supabase;
}

export async function readMeetingByProtocol(protocol: string) {
  return await requireMeetingClient().from('events')
    .select('id,company_id,title,event_type,starts_at,mode,source_type,source_entity_id,schedule_class,contract_session_number,billing_applies,billing_reason')
    .eq('protocol', protocol).maybeSingle();
}

export async function readMeetingOutcome(eventId: string) {
  return await requireMeetingClient().from('event_outcomes')
    .select('outcome,reason_category,justified,note,transcription_url,transcription_note,marked_at').eq('event_id', eventId).maybeSingle();
}

export async function readClientScheduledWork(companyId: string) {
  const client = requireMeetingClient();
  return await Promise.all([
    client.from('events').select('id,company_id,protocol,title,starts_at,ends_at,mode,location,meeting_url,description,visibility,source_type,source_entity_id,schedule_class,billing_applies,google_html_link,sync_status')
      .eq('company_id', companyId).eq('visibility', 'client').is('cancelled_at', null).order('starts_at'),
    client.from('deliverables').select('id,title,status,due_at').eq('company_id', companyId)
      .eq('client_visible', true).not('due_at', 'is', null).neq('status', 'cancelled').order('due_at'),
  ]);
}

export async function findMeetingToClassify(companyId: string, name: string, protocol: string, day: string) {
  const query = requireMeetingClient().from('events').select('id').eq('company_id', companyId).eq('title', name)
    .eq('event_type', 'meeting').order('created_at', { ascending: false }).limit(1);
  if (protocol) query.eq('protocol', protocol);
  else if (day) query.gte('starts_at', `${day}T00:00:00-03:00`).lte('starts_at', `${day}T23:59:59-03:00`);
  const { data } = await query.maybeSingle();
  return data?.id as string | undefined;
}

export async function recordMeetingOutcome(eventId: string, schedulingRequest: boolean, occurred: boolean, reason: string | null, justified: boolean, note: string) {
  const client = requireMeetingClient();
  const input = { p_event_id: eventId, p_outcome: occurred ? 'occurred' : 'not_occurred', p_reason_category: reason, p_justified: justified, p_note: note };
  return schedulingRequest ? await client.rpc('admin_mark_scheduling_event_outcome_v1', { ...input, p_convert_to_virtual: false })
    : await client.rpc('admin_mark_calendar_event_outcome_v66', input);
}

export async function saveMeetingTranscription(eventId: string, url: string, note: string) {
  return await requireMeetingClient().rpc('admin_save_event_transcription_v69', { p_event_id: eventId, p_url: url, p_note: note });
}

export async function uploadMeetingTranscription(eventId: string, path: string, file: File) {
  const client = requireMeetingClient();
  const upload = await client.storage.from('cali-workspace-private').upload(path, file, { upsert: false, contentType: file.type });
  if (upload.error) throw upload.error;
  const { error } = await client.rpc('admin_attach_meeting_record_v1', { p_event_id: eventId, p_path: path, p_name: file.name });
  if (error) throw error;
}

export async function readReportAgendaSnapshot(protocol: string) {
  return await requireMeetingClient().from('reports').select('source_snapshot').eq('protocol', protocol)
    .maybeSingle().overrideTypes<{ source_snapshot: { agendaCompliance?: ReportAgendaCompliance } | null }, { merge: false }>();
}
