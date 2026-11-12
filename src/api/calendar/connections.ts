import type { JsonValue } from '../../domain/json';
import { z } from 'zod';
import { supabase } from '../supabase';

const connection = z.object({
  id: z.string(), account_email: z.string().nullish(), status: z.string().nullish(),
  sync_enabled: z.boolean().nullish(), last_sync_at: z.string().nullish(),
});
const authorize = z.object({ url: z.string().min(1) });
const providerError = z.object({ error: z.string().optional(), detail: z.string().optional() });

export type GoogleCalendarConnection = z.infer<typeof connection>;

export async function readClientGoogleConnection() {
  if (!supabase) throw new Error('Supabase indisponível.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sessão do cliente não encontrada.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
  if (profileError) throw profileError;
  const companyId = profile?.company_id || '';
  if (!companyId) return { companyId, connection: null };
  const result = await supabase.from('calendar_connections').select('id,account_email,status,sync_enabled,last_sync_at')
    .eq('user_id', userId).eq('provider', 'google').eq('company_id', companyId)
    .eq('status', 'connected').limit(1).maybeSingle();
  if (result.error) throw result.error;
  return { companyId, connection: connection.nullable().parse(result.data) };
}

async function changeGoogleConnection(action: 'authorize' | 'disconnect', companyId: string | null) {
  if (!supabase) throw new Error('Supabase indisponível.');
  const result = await supabase.functions.invoke<JsonValue>('google-calendar-oauth', { body: { action, companyId } });
  if (result.error) throw result.error;
  const failure = providerError.safeParse(result.data).data;
  if (failure?.error) throw new Error(failure.detail || failure.error);
  return result.data;
}

export async function authorizeGoogleCalendar(companyId: string | null) {
  const result = authorize.safeParse(await changeGoogleConnection('authorize', companyId));
  if (!result.success) throw new Error('O Google não retornou a tela de autorização.');
  return result.data.url;
}

export async function disconnectGoogleCalendar(companyId: string) {
  await changeGoogleConnection('disconnect', companyId);
}

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  htmlLink: string | null;
  color: string;
  textColor: string | null;
  organizer: string | null;
  meetingUrl: string | null;
  attendees: Array<{ name: string; email: string; status: string; self: boolean }>;
  reminderMinutes: number | null;
};

type GoogleCalendarEventsResponse =
  | { state: 'checked'; events: GoogleCalendarEvent[] }
  | { state: 'reconnect_required' }
  | { state?: never; error: string };

export async function readGoogleCalendarEvents(action: 'events' | 'client_events', range: { start: string; end: string }) {
  if (!supabase) return { data: null, error: { message: 'Supabase indisponível.' } };
  return await supabase.functions.invoke<GoogleCalendarEventsResponse>('workspace-google-calendar-read', { body: { action, ...range } });
}

export async function refreshGoogleEventStatus(eventIds: string[]) {
  const client = supabase;
  if (!client) return;
  await Promise.allSettled(eventIds.map((eventId) => client.functions.invoke('google-calendar-refresh-event', { body: { eventId } })));
}
