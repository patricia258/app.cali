import { GoogleIntegrationError, type googleActor, type googleRequest } from './google-integration.ts';

type Context = Awaited<ReturnType<typeof googleActor>>;
type Config = ReturnType<typeof googleRequest>;
type Db = Context['db'];
type EventRow = Record<string, any>;
type Connection = Record<string, any>;

const eventsEndpoint = (calendar: string) => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`;
const eventIdentity = (id: string) => 'cali' + id.replaceAll('-', '');

export async function calendarEvent(actor: Context, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new GoogleIntegrationError('invalid_event_id');
  const visible = await actor.workspace.from('events').select('id').eq('id', id).maybeSingle();
  if (visible.error || !visible.data) throw new GoogleIntegrationError('event_access_denied', 403);
  const loaded = await actor.db.from('events').select('*').eq('id', id).maybeSingle();
  if (loaded.error || !loaded.data) throw new GoogleIntegrationError('event_not_found', 404);
  return loaded.data;
}

export async function calendarConnection(db: Db, event: EventRow, userId?: string, companyId?: string | null) {
  let query = db.from('calendar_connections').select('*').eq('provider', 'google').eq('status', 'connected').eq('sync_enabled', true).eq('is_primary', true);
  if (event.google_connection_id) {
    query = query.eq('id', event.google_connection_id);
  } else if (event.google_event_id && event.source_type !== 'scheduling_request' && event.created_by) {
    const creator = await db.from('profiles').select('role,company_id').eq('id', event.created_by).maybeSingle();
    if (creator.error || !creator.data) return null;
    query = query.eq('user_id', event.created_by);
    query = creator.data.role === 'admin' ? query.is('company_id', null) : query.eq('company_id', creator.data.company_id);
  } else if (userId) {
    query = query.eq('user_id', userId);
    query = companyId ? query.eq('company_id', companyId) : query.is('company_id', null);
  } else {
    const admins = await db.from('profiles').select('id').eq('role', 'admin').eq('active', true);
    if (admins.error || !admins.data?.length) return null;
    query = query.is('company_id', null).in('user_id', admins.data.map(row => row.id));
  }
  const loaded = await query.order('updated_at', { ascending: false }).limit(2);
  if (loaded.error || !loaded.data?.length) return null;
  if (event.google_event_id && !event.google_connection_id && loaded.data.length > 1) return null;
  const found = loaded.data[0];
  if ((event.google_account_email && String(event.google_account_email).toLowerCase() !== String(found.account_email).toLowerCase()) ||
    (event.google_account_id && event.google_account_id !== found.provider_account_id)) return null;
  return found;
}

export async function calendarAccessToken(config: Config, db: Db, connection: Connection) {
  config.assertAccount(connection.account_email);
  const key = String(connection.credential_key || `${connection.user_id}:${connection.company_id || 'self'}`);
  const { data: credential, error } = await db.from('google_calendar_credentials').select('*').eq('credential_key', key).maybeSingle();
  if (error || !credential) throw new GoogleIntegrationError('google_credential_not_found', 409);
  if (String(credential.account_email).toLowerCase() !== String(connection.account_email).toLowerCase() ||
      (connection.provider_account_id && credential.provider_account_id !== connection.provider_account_id)) {
    throw new GoogleIntegrationError('google_account_mismatch', 409);
  }
  if (credential.access_token && Date.parse(credential.expires_at || '') > Date.now() + 60000) return String(credential.access_token);
  if (!credential.refresh_token) throw new GoogleIntegrationError('google_refresh_token_missing', 409);
  const refreshed = await config.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId, client_secret: config.clientSecret, refresh_token: credential.refresh_token, grant_type: 'refresh_token',
    }),
  });
  const token = await refreshed.json().catch(() => ({}));
  if (!refreshed.ok || !token.access_token) throw new GoogleIntegrationError('google_reconnect_required', 409);
  const saved = await db.from('google_calendar_credentials').update({
    access_token: token.access_token, refresh_token: token.refresh_token || credential.refresh_token,
    expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    token_type: token.token_type || credential.token_type, scope: token.scope || credential.scope,
    updated_at: new Date().toISOString(),
  }).eq('credential_key', key);
  if (saved.error) throw new GoogleIntegrationError('google_credential_unavailable', 503);
  return String(token.access_token);
}

async function attendeeEmails(db: Db, eventId: string, organizer: string) {
  const people = await db.from('event_attendees').select('email').eq('event_id', eventId);
  if (people.error) throw new GoogleIntegrationError('event_attendees_unavailable', 503);
  return [...new Set((people.data || []).map(row => String(row.email || '').trim().toLowerCase()).filter(email => email && email !== organizer))].sort();
}

async function meetSettings(config: Config, token: string, meetingUrl: string) {
  let url: URL;
  try { url = new URL(meetingUrl); } catch { return { enabled: false, reason: 'meeting_code_missing', spaceName: null }; }
  if (url.origin !== 'https://meet.google.com' || !/^\/[a-z0-9-]+$/.test(url.pathname)) return { enabled: false, reason: 'meeting_code_missing', spaceName: null };
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const found = await config.fetch('https://meet.googleapis.com/v2/spaces' + url.pathname, { headers });
  const space = await found.json().catch(() => ({}));
  if (!found.ok || !/^spaces\/[A-Za-z0-9_-]+$/.test(space.name || '')) {
    return { enabled: false, reason: 'meet_space_unavailable', spaceName: null };
  }
  if (space.config?.artifactConfig?.transcriptionConfig?.autoTranscriptionGeneration === 'ON') {
    return { enabled: true, reason: null, spaceName: space.name };
  }
  const updated = await config.fetch('https://meet.googleapis.com/v2/' + space.name +
    '?updateMask=config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration', {
    method: 'PATCH', headers,
    body: JSON.stringify({ config: { artifactConfig: { transcriptionConfig: { autoTranscriptionGeneration: 'ON' } } } }),
  });
  return { enabled: updated.ok, reason: updated.ok ? null : 'meet_settings_unavailable', spaceName: space.name };
}

export async function syncCalendarEvent(config: Config, db: Db, event: EventRow, connection: Connection) {
  if (event.cancelled_at) return { status: 'cancelled_local' };
  const calendar = String(event.google_calendar_id || connection.calendar_id || 'primary');
  config.assertCalendar(calendar);
  config.assertAccount(connection.account_email);
  const attendees = await attendeeEmails(db, event.id, String(connection.account_email || '').toLowerCase());
  const updates = config.invitations(attendees);
  const token = await calendarAccessToken(config, db, connection);
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const timezone = event.timezone || 'America/Sao_Paulo';
  const startDate = String(event.starts_at).slice(0, 10);
  const endDay = new Date(startDate + 'T12:00:00Z');
  endDay.setUTCDate(endDay.getUTCDate() + 1);
  const fields = {
    summary: event.title, description: event.description || '', location: event.location || '',
    attendees: attendees.map(email => ({ email })),
    reminders: { useDefault: false, overrides: Number(event.reminder_minutes) > 0
      ? [{ method: 'popup', minutes: Number(event.reminder_minutes) }] : [] },
    start: event.all_day ? { date: startDate } : { dateTime: event.starts_at, timeZone: timezone },
    end: event.all_day ? { date: endDay.toISOString().slice(0, 10) }
      : { dateTime: event.ends_at || event.starts_at, timeZone: timezone },
  };
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([fields, event.mode, event.protocol, event.source_entity_id])));
  const revision = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  const providerId = String(event.google_event_id || eventIdentity(event.id));
  const base = eventsEndpoint(calendar);
  const existingUrl = base + '/' + encodeURIComponent(providerId);
  const requested = '?sendUpdates=' + updates + '&conferenceDataVersion=1';
  async function getProviderEvent() {
    const response = await config.fetch(existingUrl, { headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && ![404, 410].includes(response.status)) throw new GoogleIntegrationError('google_calendar_read_failed', 502);
    const linked = data.extendedProperties?.private?.caliWorkspaceEventId;
    if (response.ok && (linked && linked !== event.id || !linked && !event.google_event_id)) {
      throw new GoogleIntegrationError('google_event_link_mismatch', 409);
    }
    return { found: response.ok, data };
  }

  let provider = await getProviderEvent();
  let createdForRevision = false;
  const body = () => ({
    ...fields,
    extendedProperties: { private: {
      ...provider.data.extendedProperties?.private, caliWorkspaceEventId: event.id,
      caliProtocol: event.protocol || '', caliSchedulingRequestId: event.source_entity_id || '', caliRevision: revision,
    } },
    ...(event.mode === 'remote' && !provider.data.hangoutLink && !event.meeting_url
      ? { conferenceData: { createRequest: { requestId: eventIdentity(event.id), conferenceSolutionKey: { type: 'hangoutsMeet' } } } }
      : {}),
  });
  if (!provider.found) {
    if (event.google_event_id) throw new GoogleIntegrationError('google_event_missing', 409);
    const created = await config.fetch(base + requested, {
      method: 'POST', headers, body: JSON.stringify({ ...body(), id: providerId }),
    });
    if (created.status === 409) {
      provider = await getProviderEvent();
      if (!provider.found) throw new GoogleIntegrationError('google_event_conflict', 409);
    } else {
      if (!created.ok) throw new GoogleIntegrationError('google_calendar_sync_failed', 502);
      provider = { found: true, data: await created.json() };
      createdForRevision = true;
    }
  }
  if (!createdForRevision && provider.data.extendedProperties?.private?.caliRevision !== revision) {
    const changed = await config.fetch(existingUrl + requested, { method: 'PATCH', headers, body: JSON.stringify(body()) });
    if (!changed.ok) throw new GoogleIntegrationError('google_calendar_sync_failed', 502);
    provider = { found: true, data: await changed.json() };
  }

  const meetingUrl = provider.data.hangoutLink || event.meeting_url || null;
  let transcription = { enabled: false, reason: null as string | null, spaceName: event.meet_space_name || null };
  if (event.mode === 'remote' && event.auto_transcription && meetingUrl) {
    try { transcription = await meetSettings(config, token, meetingUrl); }
    catch { transcription.reason = 'meet_settings_unavailable'; }
  }
  const now = new Date().toISOString();
  const patched = await db.from('events').update({
    google_connection_id: connection.id, google_account_id: connection.provider_account_id || null,
    google_account_email: connection.account_email, google_calendar_id: calendar, google_event_id: providerId,
    google_html_link: provider.data.htmlLink || event.google_html_link || null, meeting_url: meetingUrl,
    meet_space_name: transcription.spaceName, sync_status: 'synced', updated_at: now,
  }).eq('id', event.id).eq('updated_at', event.updated_at).is('cancelled_at', null).select('id').maybeSingle();
  if (patched.error || !patched.data) throw new GoogleIntegrationError('event_changed_retry', 409);
  await db.from('calendar_connections').update({ last_sync_at: now, updated_at: now }).eq('id', connection.id);
  return { status: 'synced', googleEventId: providerId, googleHtmlLink: provider.data.htmlLink || null, meetingUrl,
    accountEmail: connection.account_email, organizer: connection.account_email, transcription };
}

export async function deleteCalendarEvent(config: Config, db: Db, event: EventRow, connection: Connection) {
  const calendar = String(event.google_calendar_id || connection.calendar_id || 'primary');
  config.assertCalendar(calendar);
  const updates = config.invitations(await attendeeEmails(db, event.id, String(connection.account_email || '').toLowerCase()));
  const token = await calendarAccessToken(config, db, connection);
  const providerId = String(event.google_event_id || eventIdentity(event.id));
  const url = eventsEndpoint(calendar) + '/' + encodeURIComponent(providerId);
  const headers = { Authorization: 'Bearer ' + token };
  const lookup = await config.fetch(url, { headers });
  if ([404, 410].includes(lookup.status)) return;
  if (!lookup.ok) throw new GoogleIntegrationError('google_calendar_read_failed', 502);
  const found = await lookup.json();
  const bound = found.extendedProperties?.private?.caliWorkspaceEventId;
  if (bound && bound !== event.id || !bound && !event.google_event_id) throw new GoogleIntegrationError('google_event_link_mismatch', 409);
  const removed = await config.fetch(url + '?sendUpdates=' + updates, { method: 'DELETE', headers });
  if (!removed.ok && ![404, 410].includes(removed.status)) throw new GoogleIntegrationError('google_calendar_delete_failed', 502);
}
