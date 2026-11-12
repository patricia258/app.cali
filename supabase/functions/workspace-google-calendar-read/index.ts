import { googleActor, googleFailure, googleRequest } from '../_shared/google-integration.ts';
import { calendarAccessToken } from '../_shared/google-calendar-events.ts';

const requiredScope = 'https://www.googleapis.com/auth/calendar.readonly';

Deno.serve(async (request) => {
  const config = googleRequest(request);
  const rejection = config.reject();
  if (rejection) return rejection;
  if (!config.configured) return config.json({ error: 'integration_not_configured' }, 503);
  const reply = config.json;
  try {
    const { db, profile, user } = await googleActor(request);
    let body: any;
    try {
        body = await request.json();
    }
    catch {
        return reply({ error: 'invalid_body' }, 400);
    }
    const action = String(body?.action || '');
    if (!['availability', 'events', 'client_events'].includes(action) || (action === 'events' && profile.role !== 'admin') || (action === 'client_events' && (profile.role !== 'client' || !profile.company_id)))
        return reply({ error: 'access_denied' }, 403);
    const connectionQuery = db.from('calendar_connections').select('id,calendar_id,credential_key,user_id,company_id,account_email,provider_account_id').eq('provider', 'google').eq('status', 'connected').eq('sync_enabled', true).eq('is_primary', true);
    const { data: connection } = await (action === 'client_events'
        ? connectionQuery.eq('user_id', user.id).eq('company_id', profile.company_id).limit(1).maybeSingle()
        : connectionQuery.is('company_id', null).in('user_id', (await db.from('profiles').select('id').eq('role', 'admin').eq('active', true)).data?.map((row: any) => row.id) || []).order('updated_at', { ascending: false }).limit(1).maybeSingle());
    if (!connection)
        return reply({ state: 'reconnect_required' });
    if (!config.calendarAllowed(connection.calendar_id || 'primary')) return reply({ state: 'reconnect_required' });
    const { data: credential } = await db.from('google_calendar_credentials').select('scope')
        .eq('credential_key', connection.credential_key).maybeSingle();
    if (!String(credential?.scope || '').split(' ').includes(requiredScope)) return reply({ state: 'reconnect_required' });
    let token: string;
    try { token = await calendarAccessToken(config, db, connection); }
    catch { return reply({ state: 'reconnect_required' }); }
    const google = async (endpoint: string, options?: RequestInit) => {
        const response = await config.fetch(`https://www.googleapis.com/calendar/v3/${endpoint}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options?.headers || {}) } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new Error(`google_${response.status}:${result?.error?.message || 'Falha ao consultar a agenda'}`);
        return result;
    };
    try {
        const calendars: {
            id: string;
            color: string;
            foreground: string;
            colorId: string;
        }[] = [];
        let page = '';
        do {
            const params = new URLSearchParams({ maxResults: '250' });
            if (page)
                params.set('pageToken', page);
            const list = await google(`users/me/calendarList?${params}`);
            for (const item of list.items || [])
                if (item.id && !item.deleted && config.calendarAllowed(item.id))
                    calendars.push({ id: item.id, color: item.backgroundColor || '', foreground: item.foregroundColor || '', colorId: item.colorId || '' });
            page = list.nextPageToken || '';
        } while (page && calendars.length < 250);
        if (!calendars.length)
            return reply({ error: 'calendar_empty' }, 409);
        if (action === 'availability') {
            if (profile.role !== 'client' || !profile.company_id)
                return reply({ error: 'access_denied' }, 403);
            const slots = body?.slots;
            if (!Array.isArray(slots) || slots.length < 1 || slots.length > 2)
                return reply({ error: 'invalid_slots' }, 400);
            const parsed = slots.map((slot: any) => ({ start: new Date(slot.startsAt).getTime(), end: new Date(slot.endsAt).getTime() }));
            if (parsed.some((slot: any) => !Number.isFinite(slot.start) || !Number.isFinite(slot.end) || slot.end <= slot.start || slot.start < Date.now() + 48 * 3600000 || slot.end > Date.now() + 180 * 86400000 || ![30, 45, 60, 90, 240].includes((slot.end - slot.start) / 60000)))
                return reply({ error: 'invalid_slots' }, 400);
            const { count, error: countError } = await db.from('activity_log').select('id', { count: 'exact', head: true }).eq('actor_user_id', user.id).eq('event_type', 'client_calendar_availability_checked').gte('created_at', new Date(Date.now() - 3600000).toISOString());
            if (countError)
                throw countError;
            if ((count || 0) >= 45)
                return reply({ error: 'availability_limit' }, 429);
            const { error: auditError } = await db.from('activity_log').insert({ company_id: profile.company_id, actor_user_id: user.id, event_type: 'client_calendar_availability_checked', entity_type: 'calendar', metadata: { slots: slots.map((slot: any) => ({ startsAt: slot.startsAt, endsAt: slot.endsAt })) } });
            if (auditError)
                throw auditError;
            const min = new Date(Math.min(...parsed.map((slot: any) => slot.start))).toISOString();
            const max = new Date(Math.max(...parsed.map((slot: any) => slot.end))).toISOString();
            const busy: {
                start: number;
                end: number;
            }[] = [];
            // Agendas assinadas (feriados, agendas de terceiros) podem não responder: são ignoradas, sem derrubar a consulta.
            // Se o Google inteiro falhar, a resposta segue com os compromissos do próprio Workspace (google: false).
            let googleOk = true;
            try {
                for (let i = 0; i < calendars.length; i += 50) {
                    const result = await google('freeBusy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeMin: min, timeMax: max, timeZone: 'America/Sao_Paulo', items: calendars.slice(i, i + 50).map(calendar => ({ id: calendar.id })) }) });
                    for (const entry of Object.values(result.calendars || {}) as any[]) {
                        if (entry.errors?.length)
                            continue;
                        for (const interval of entry.busy || [])
                            busy.push({ start: new Date(interval.start).getTime(), end: new Date(interval.end).getTime() });
                    }
                }
            }
            catch {
                googleOk = false;
            }
            const { data: local, error } = await db.from('events').select('starts_at,ends_at').is('cancelled_at', null).lt('starts_at', max).gt('ends_at', min);
            if (error)
                throw error;
            for (const event of local || [])
                busy.push({ start: new Date(event.starts_at).getTime(), end: new Date(event.ends_at).getTime() });
            return reply({ state: 'checked', google: googleOk, slots: parsed.map((slot: any) => ({ busy: busy.some((period) => period.start < slot.end && period.end > slot.start) })) });
        }
        const start = new Date(body?.start || 0).getTime(), end = new Date(body?.end || 0).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end - start > 62 * 86400000)
            return reply({ error: 'invalid_range' }, 400);
        const items: any[] = [], byIdentity = new Map<string, number>();
        const palette = await google('colors');
        for (const calendar of calendars) {
            let next = '';
            do {
                const params = new URLSearchParams({ timeMin: new Date(start).toISOString(), timeMax: new Date(end).toISOString(), singleEvents: 'true', maxResults: '250', showDeleted: 'false' });
                if (next)
                    params.set('pageToken', next);
                const result = await google(`calendars/${encodeURIComponent(calendar.id)}/events?${params}`);
                for (const entry of result.items || []) {
                    if (entry.status === 'cancelled' || !entry.start)
                        continue;
                    const identity = `${entry.iCalUID || entry.id}:${entry.start.dateTime || entry.start.date}`;
                    const eventColor = entry.colorId ? palette.event?.[entry.colorId] : null;
                    const calendarColor = palette.calendar?.[calendar.colorId];
                    const mapped = { id: entry.id, calendarId: calendar.id, title: entry.summary || 'Ocupado', start: entry.start.dateTime || entry.start.date, end: entry.end?.dateTime || entry.end?.date, allDay: Boolean(entry.start.date), location: entry.location || null, description: entry.description || null, htmlLink: entry.htmlLink || null, color: eventColor?.background || calendar.color || calendarColor?.background || '#8D7354', textColor: eventColor?.foreground || calendar.foreground || calendarColor?.foreground || null, explicitColor: Boolean(eventColor), organizer: entry.organizer?.displayName || entry.organizer?.email || null, meetingUrl: entry.hangoutLink || entry.conferenceData?.entryPoints?.find((point: any) => point.entryPointType === 'video')?.uri || null, attendees: (entry.attendees || []).map((guest: any) => ({ name: guest.displayName || guest.email || 'Convidado', email: guest.email || '', status: guest.responseStatus || 'needsAction', self: Boolean(guest.self) })), reminderMinutes: entry.reminders?.overrides?.find((reminder: any) => reminder.method === 'popup')?.minutes ?? null };
                    const previousIndex = byIdentity.get(identity);
                    if (previousIndex == null) {
                        byIdentity.set(identity, items.length);
                        items.push(mapped);
                    }
                    else if (mapped.explicitColor && !items[previousIndex].explicitColor)
                        items[previousIndex] = mapped;
                }
                next = result.nextPageToken || '';
            } while (next && items.length < 5000);
        }
        return reply({ state: 'checked', events: items.map(({ explicitColor, ...event }) => event) });
    }
    catch (error) {
        return reply({ error: 'calendar_unavailable' }, 502);
    }
  } catch (error) {
    return googleFailure(config, error);
  }
});
