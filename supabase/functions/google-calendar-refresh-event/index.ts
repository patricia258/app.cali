import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const env = (name: string) => (Deno.env.get(name) || '').trim();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

function responseLabel(status: string) {
  if (status === 'accepted') return 'aceitou';
  if (status === 'declined') return 'recusou';
  if (status === 'tentative') return 'marcou como talvez';
  return 'permanece sem resposta';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) return json({ error: 'missing_authorization' }, 401);

    const supabaseUrl = env('SUPABASE_URL');
    const anonKey = env('SUPABASE_ANON_KEY');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = env('GOOGLE_CLIENT_ID');
    const clientSecret = env('GOOGLE_CLIENT_SECRET');
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'invalid_session' }, 401);

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }).schema('cali_workspace');
    const { data: profile } = await service.from('profiles').select('id,role,company_id,active').eq('id', userData.user.id).maybeSingle();
    if (!profile?.active) return json({ error: 'profile_not_available' }, 403);

    const body = await req.json().catch(() => ({}));
    const eventId = String(body?.eventId || '');
    if (!eventId) return json({ error: 'missing_event_id' }, 400);

    const { data: event } = await service.from('events').select('*').eq('id', eventId).maybeSingle();
    if (!event) return json({ error: 'event_not_found' }, 404);
    if (profile.role !== 'admin' && event.company_id !== profile.company_id) return json({ error: 'event_access_denied' }, 403);
    if (!event.google_event_id) return json({ status: 'local' });

    let connection: any = null;
    if (event.created_by) {
      const { data: creator } = await service.from('profiles').select('id,role,company_id').eq('id', event.created_by).maybeSingle();
      let q = service.from('calendar_connections').select('*').eq('provider', 'google').eq('status', 'connected').eq('sync_enabled', true).eq('is_primary', true);
      if (creator?.role === 'admin') q = q.eq('user_id', event.created_by).is('company_id', null);
      else q = q.is('company_id', null);
      const result = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      connection = result.data || null;
    }
    if (!connection) {
      const result = await service.from('calendar_connections').select('*').eq('provider', 'google').eq('status', 'connected').eq('sync_enabled', true).eq('is_primary', true).is('company_id', null).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      connection = result.data || null;
    }
    if (!connection) return json({ status: 'connection_missing' });

    const credentialKey = String(connection.credential_key || `${connection.user_id}:${connection.company_id || 'self'}`);
    const { data: credential } = await service.from('google_calendar_credentials').select('*').eq('credential_key', credentialKey).maybeSingle();
    if (!credential) return json({ status: 'credential_missing' });

    let token = String(credential.access_token || '');
    const expiry = credential.expires_at ? new Date(credential.expires_at).getTime() : 0;
    if (!token || expiry <= Date.now() + 60000) {
      if (!credential.refresh_token) return json({ status: 'refresh_token_missing' });
      const refresh = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: credential.refresh_token, grant_type: 'refresh_token' }),
      });
      const td = await refresh.json();
      if (!refresh.ok || !td.access_token) return json({ error: 'google_refresh_failed' }, 502);
      token = String(td.access_token);
      await service.from('google_calendar_credentials').update({ access_token: token, expires_at: new Date(Date.now() + Number(td.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('credential_key', credentialKey);
    }

    const calendarId = event.google_calendar_id || connection.calendar_id || 'primary';
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_event_id)}`, { headers: { Authorization: `Bearer ${token}` } });
    const googleEvent = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: 'google_event_fetch_failed', detail: googleEvent?.error?.message || response.status }, 502);

    const organizerEmail = String(googleEvent.organizer?.email || connection.account_email || '').trim().toLowerCase();
    const attendeeStatus = new Map<string, string>();
    for (const attendee of googleEvent.attendees || []) {
      const email = String(attendee.email || '').trim().toLowerCase();
      if (!email) continue;
      const status = attendee.responseStatus === 'accepted' ? 'accepted' : attendee.responseStatus === 'declined' ? 'declined' : attendee.responseStatus === 'tentative' ? 'tentative' : 'pending';
      attendeeStatus.set(email, status);
    }
    if (organizerEmail) attendeeStatus.set(organizerEmail, 'accepted');

    const changed: any[] = [];
    const { data: localAttendees } = await service.from('event_attendees').select('id,email,status,attendee_type,user_id').eq('event_id', event.id);
    for (const attendee of localAttendees || []) {
      const email = String(attendee.email || '').trim().toLowerCase();
      if (!email) continue;

      const isOrganizer = email === organizerEmail || (event.source_type === 'scheduling_request' && attendee.attendee_type === 'admin');
      const next = isOrganizer ? 'accepted' : attendeeStatus.get(email);
      if (!next || next === attendee.status) continue;

      await service.from('event_attendees').update({ status: next, responded_at: next === 'pending' ? null : new Date().toISOString() }).eq('id', attendee.id);
      changed.push({ email, from: attendee.status, to: next, attendeeType: attendee.attendee_type });

      if (attendee.attendee_type === 'client' && ['accepted', 'declined', 'tentative'].includes(next)) {
        const bodyText = `${email} ${responseLabel(next)} o convite “${event.title}”.`;
        await service.rpc('notify_workspace_movement', {
          p_company_id: event.company_id || null,
          p_actor_id: null,
          p_target: 'admin',
          p_notification_type: 'calendar_attendee_response',
          p_title: 'Resposta ao convite',
          p_body: bodyText,
          p_entity_type: 'event',
          p_entity_id: event.id,
          p_action_url: '/admin/calendario',
          p_relevance: 'normal',
          p_email_required: false,
        });
      }
    }

    const nextGoogleHtmlLink = googleEvent.htmlLink || event.google_html_link || null;
    const nextMeetingUrl = googleEvent.hangoutLink || event.meeting_url || null;
    if (nextGoogleHtmlLink !== event.google_html_link || nextMeetingUrl !== event.meeting_url) {
      await service.from('events').update({ google_html_link: nextGoogleHtmlLink, meeting_url: nextMeetingUrl, updated_at: new Date().toISOString() }).eq('id', event.id);
    }

    return json({
      status: 'refreshed',
      googleHtmlLink: nextGoogleHtmlLink,
      meetingUrl: nextMeetingUrl,
      organizer: organizerEmail || null,
      attendees: Array.from(attendeeStatus.entries()).map(([email, status]) => ({ email, status })),
      changed,
    });
  } catch (error) {
    console.error('google-calendar-refresh-event', error);
    return json({ error: error instanceof Error ? error.message : 'unknown_error' }, 500);
  }
});
