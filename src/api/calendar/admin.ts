import type { JsonObject } from '../../domain/json';
import { supabase } from '../supabase';

export async function readAdminCalendar(staff: boolean) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const [{ data: companyRows }, { data: eventRows }, { data: attendeeRows }, { data: deadlineRows }, { data: connectionRows }, { data: requestRows }, { data: projectRows }] = await Promise.all([
    staff ? supabase.rpc('partner_companies') : supabase.from('companies').select('id, display_name, logo_url, logo_workspace_url').neq('status', 'archived').order('display_name'),
    supabase.from('events').select('staff_visible,id,protocol,title,company_id,project_id,event_type,color_hex,starts_at,ends_at,all_day,mode,location,meeting_url,description,visibility,source_type,source_entity_id,google_event_id,sync_status,cancelled_at,reminder_minutes,auto_transcription').order('starts_at'),
    supabase.from('event_attendees').select('id,event_id,name,email,status,response_note').order('created_at'),
    supabase.from('deliverables').select('id, company_id, project_id, title, due_at, status, protocol').not('due_at', 'is', null).order('due_at'),
    supabase.from('calendar_connections').select('id, status').eq('provider', 'google').eq('status', 'connected').limit(1),
    supabase.from('scheduling_requests').select('id,company_id,title,status,request_mode,requested_slots,admin_proposed_slots,purpose,location,extra_visit,online_extra_requested').in('status', ['submitted','reschedule_review']).order('created_at', { ascending: false }).limit(100),
    supabase.from('projects').select('id,name'),
  ]);
  return { companyRows, eventRows, attendeeRows, deadlineRows, connectionRows, requestRows, projectRows };
}

export async function readMeetingOutcomes(eventIds: string[]) {
  if (!supabase) return { data: null, error: { message: 'Conexão indisponível.' } };
  return await supabase.from('event_outcomes').select('event_id,outcome,transcription_url,transcription_attachment_name').in('event_id', eventIds);
}

export async function submitStaffCalendarChange(
  companyId: string, action: string, title: string, payload: JsonObject,
) {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('staff_review_requests').insert({
    staff_user_id: auth.user?.id, company_id: companyId, kind: 'change', title: title.slice(0, 200),
    payload: { action, ...payload },
  });
  return !error;
}

type CalendarEventWrite = {
  title: string; company_id: string | null; visibility: string; starts_at: string; ends_at: string;
} & JsonObject;

export async function saveCalendarEvent(event: CalendarEventWrite, attendees: string[], eventId?: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const client = supabase;
  const people = (id: string) => attendees.map((email) => ({
    event_id: id, company_id: event.company_id, name: email.split('@')[0], email,
    attendee_type: event.visibility === 'client' ? 'client' : 'external', status: 'pending',
  }));

  if (eventId) {
    const { error } = await client.from('events').update(event).eq('id', eventId);
    if (error) throw error;
    await client.from('event_attendees').delete().eq('event_id', eventId);
    if (attendees.length) await client.from('event_attendees').insert(people(eventId));
    return;
  }
  const { data: userData } = await client.auth.getUser();
  const { data: inserted, error } = await client.from('events').insert({
    ...event, created_by: userData.user?.id || null,
  }).select('id, protocol').single();
  if (error) throw error;
  if (inserted?.id && attendees.length) await client.from('event_attendees').insert(people(inserted.id));
}

export async function cancelCalendarEvent(id: string, reason: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const { error } = await supabase.from('events').update({
    cancelled_at: new Date().toISOString(), cancellation_reason: reason.trim(),
  }).eq('id', id);
  if (error) throw error;
}
