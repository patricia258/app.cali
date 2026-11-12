import type { JsonObject } from '../../domain/json';
import { supabase } from '../supabase';

function requireCalendarClient() {
  if (!supabase) throw new Error('Supabase indisponível.');
  return supabase;
}

export async function readAdminGoogleConnection() {
  const client = requireCalendarClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user?.id) return null;
  const { data } = await client.from('calendar_connections')
    .select('id,user_id,company_id,account_email,status,sync_enabled,is_primary').eq('user_id', auth.user.id)
    .eq('provider', 'google').is('company_id', null).eq('status', 'connected').eq('sync_enabled', true).eq('is_primary', true).limit(1).maybeSingle();
  return data;
}

export async function invokeGoogleCalendar(body: JsonObject) {
  return await requireCalendarClient().functions.invoke('google-calendar-oauth', { body });
}

export async function runGoogleCalendarOperation(body: JsonObject) {
  const { data, error } = await invokeGoogleCalendar(body);
  if (error) throw error;
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

export async function refreshGoogleCalendarEvent(eventId: string) {
  const { data, error } = await requireCalendarClient().functions.invoke('google-calendar-refresh-event', { body: { eventId } });
  return error ? null : data;
}

export async function findCalendarEventForSync(protocol: string | null, title: string) {
  const client = requireCalendarClient();
  if (protocol) return (await client.from('events').select('id,sync_status').eq('protocol', protocol).maybeSingle()).data;
  if (!title) return null;
  const { data: auth } = await client.auth.getUser();
  const query = client.from('events').select('id,sync_status').eq('title', title).order('created_at', { ascending: false }).limit(1);
  if (auth.user?.id) query.eq('created_by', auth.user.id);
  return (await query.maybeSingle()).data;
}

export async function listMyPendingCalendarEvents(since: string) {
  const client = requireCalendarClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user?.id) return [];
  const { data } = await client.from('events').select('id,sync_status,created_at').eq('created_by', auth.user.id)
    .in('sync_status', ['pending', 'error']).gte('created_at', since).is('cancelled_at', null).order('created_at', { ascending: false }).limit(10);
  return data ?? [];
}

export async function readGoogleCalendarEvent(key: { protocol: string } | { id: string }) {
  const event = requireCalendarClient().from('events')
    .select('id,protocol,google_event_id,google_html_link,meeting_url,reminder_minutes,auto_transcription,sync_status');
  return await ('id' in key ? event.eq('id', key.id) : event.eq('protocol', key.protocol)).maybeSingle();
}

export function observeCalendarEventSync(listener: (row: { id?: string; cancelled_at?: string | null; sync_status?: string }) => void) {
  const client = requireCalendarClient();
  const channel = client.channel('cali-google-calendar-sync')
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'events' }, (event) => {
      if ('id' in event.new) listener(event.new);
    }).subscribe();
  return () => { void client.removeChannel(channel); };
}
