import { googleActor, googleFailure, GoogleIntegrationError, googleRequest, withGoogleLease } from '../_shared/google-integration.ts';
import { calendarAccessToken, calendarConnection, calendarEvent } from '../_shared/google-calendar-events.ts';

function responseLabel(status: string) {
  if (status === 'accepted') return 'aceitou';
  if (status === 'declined') return 'recusou';
  if (status === 'tentative') return 'marcou como talvez';
  return 'permanece sem resposta';
}

Deno.serve(async (request) => {
  const config = googleRequest(request);
  const rejection = config.reject();
  if (rejection) return rejection;
  if (!config.configured) return config.json({ error: 'google_not_configured' }, 503);
  const json = config.json;
  try {
    const actor = await googleActor(request);
    const { db: service } = actor;
    const body = await request.json().catch(() => ({}));
    const id = String(body.eventId || '');
    if (!/^[a-f0-9-]{36}$/.test(id)) return json({ error: 'missing_event_id' }, 400);
    return await withGoogleLease(service, 'calendar:' + id, async () => {
        const event = await calendarEvent(actor, id);
        if (!event.google_event_id) return json({ status: 'local' });
        if (event.cancelled_at) return json({ status: 'cancelled_local' });
        const connection = await calendarConnection(service, event);
        if (!connection) return json({ status: 'connection_missing' });
        const calendarId = event.google_calendar_id || connection.calendar_id || 'primary';
        config.assertCalendar(calendarId);
        const token = await calendarAccessToken(config, service, connection);
        const response = await config.fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_event_id)}`, { headers: { Authorization: 'Bearer ' + token } });
        if (!response.ok) return json({ error: 'google_event_fetch_failed' }, 502);
        const googleEvent = await response.json();
        const linked = googleEvent.extendedProperties?.private?.caliWorkspaceEventId;
        if (linked && linked !== event.id) return json({ error: 'google_event_link_mismatch' }, 409);
        const organizerEmail = String(googleEvent.organizer?.email || connection.account_email || '').trim().toLowerCase();
        const attendeeStatus = new Map<string, string>();
        for (const attendee of googleEvent.attendees || []) {
            const email = String(attendee.email || '').trim().toLowerCase();
            if (!email)
                continue;
            const status = attendee.responseStatus === 'accepted' ? 'accepted' : attendee.responseStatus === 'declined' ? 'declined' : attendee.responseStatus === 'tentative' ? 'tentative' : 'pending';
            attendeeStatus.set(email, status);
        }
        if (organizerEmail)
            attendeeStatus.set(organizerEmail, 'accepted');
        const changed: { email: string; from: string; to: string; attendeeType: string }[] = [];
        const { data: localAttendees, error: attendeeError } = await service.from('event_attendees').select('id,email,status,attendee_type,user_id').eq('event_id', event.id);
        if (attendeeError) throw new GoogleIntegrationError('event_attendees_unavailable', 503);
        for (const attendee of localAttendees || []) {
            const email = String(attendee.email || '').trim().toLowerCase();
            if (!email)
                continue;
            const isOrganizer = email === organizerEmail || (event.source_type === 'scheduling_request' && attendee.attendee_type === 'admin');
            const next = isOrganizer ? 'accepted' : attendeeStatus.get(email);
            if (!next || next === attendee.status)
                continue;
            const saved = await service.from('event_attendees').update({ status: next, responded_at: next === 'pending' ? null : new Date().toISOString() }).eq('id', attendee.id);
            if (saved.error) throw new GoogleIntegrationError('event_attendees_unavailable', 503);
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
        if (nextGoogleHtmlLink !== event.google_html_link || nextMeetingUrl !== event.meeting_url || !event.google_connection_id) {
            const saved = await service.from('events').update({
                google_html_link: nextGoogleHtmlLink, meeting_url: nextMeetingUrl,
                google_connection_id: connection.id, google_account_id: connection.provider_account_id || null,
                google_account_email: connection.account_email, updated_at: new Date().toISOString(),
            }).eq('id', event.id).eq('updated_at', event.updated_at);
            if (saved.error) throw new GoogleIntegrationError('event_changed_retry', 409);
        }
        return json({
            status: 'refreshed',
            googleHtmlLink: nextGoogleHtmlLink,
            meetingUrl: nextMeetingUrl,
            organizer: organizerEmail || null,
            attendees: Array.from(attendeeStatus.entries()).filter(([email]) =>
                actor.profile.role === 'admin' || email === organizerEmail ||
                localAttendees?.some(row => row.email?.toLowerCase() === email)
            ).map(([email, status]) => ({ email, status })),
            changed,
        });
    });
  } catch (error) {
    return googleFailure(config, error instanceof GoogleIntegrationError ? error : null);
  }
});
