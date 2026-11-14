import { googleActor, googleFailure, GoogleIntegrationError, googleRequest, withGoogleLease } from '../_shared/google-integration.ts';
import { calendarConnection, calendarEvent, syncCalendarEvent } from '../_shared/google-calendar-events.ts';

Deno.serve(async (request) => {
  const config = googleRequest(request);
  const rejection = config.reject();
  if (rejection) return rejection;
  if (!config.configured) return config.json({ error: 'google_not_configured' }, 503);
  try {
    const actor = await googleActor(request);
    const body = await request.json().catch(() => ({}));
    const id = String(body.eventId || '');
    if (!/^[a-f0-9-]{36}$/.test(id)) return config.json({ error: 'missing_event_id' }, 400);
    return await withGoogleLease(actor.db, 'calendar:' + id, async () => {
      const event = await calendarEvent(actor, id);
      if (event.source_type !== 'scheduling_request') return config.json({ error: 'not_scheduling_event' }, 400);
      const connection = await calendarConnection(actor.db, event);
      if (!connection) {
        if (!event.google_event_id) await actor.db.from('events').update({ sync_status: 'local' }).eq('id', id);
        return config.json({ status: 'admin_google_not_connected' });
      }
      return config.json(await syncCalendarEvent(config, actor.db, event, connection));
    });
  } catch (error) {
    return googleFailure(config, error instanceof GoogleIntegrationError ? error : null);
  }
});
