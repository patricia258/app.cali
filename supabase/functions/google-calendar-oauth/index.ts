import {
  claimGoogleOAuth, finishGoogleOAuth, googleActor, googleFailure, GoogleIntegrationError,
  googleOAuthToken, googleRequest, revokeUnusedGoogleCredential, startGoogleOAuth, withGoogleLease,
} from '../_shared/google-integration.ts';
import { calendarConnection, calendarEvent, deleteCalendarEvent, syncCalendarEvent } from '../_shared/google-calendar-events.ts';

Deno.serve(async (request) => {
  const config = googleRequest(request);
  const rejection = config.reject();
  if (rejection) return rejection;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || 'config');
  const parts = { clientId: Boolean(config.clientId), clientSecret: Boolean(config.clientSecret), redirectUri: Boolean(config.callback) };
  if (action === 'config') return config.json({ configured: config.configured, parts, redirectUri: config.callback?.href || null });
  if (!config.configured) return config.json({ error: 'google_oauth_not_configured', parts }, 503);

  try {
    const actor = await googleActor(request);
    const { db, user, profile } = actor;
    const companyId = profile.role === 'admin' ? body.companyId || null : profile.company_id;
    if (companyId !== null && (typeof companyId !== 'string' || !/^[a-f0-9-]{36}$/.test(companyId))) {
      return config.json({ error: 'invalid_company_id' }, 400);
    }
    if (action === 'authorize') {
      const attempt = await startGoogleOAuth(config, actor, 'calendar', companyId);
      const params = new URLSearchParams({
        client_id: config.clientId, redirect_uri: attempt.redirect, response_type: 'code',
        scope: 'openid email https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/meetings.space.settings',
        access_type: 'offline', include_granted_scopes: 'true', prompt: 'consent', state: attempt.state,
        code_challenge: attempt.challenge, code_challenge_method: 'S256',
      });
      return config.json({ url: config.authorize(params) });
    }
    if (action === 'exchange') {
      return await withGoogleLease(db, 'oauth:' + user.id, async () => {
        const code = String(body.code || '');
        const attempt = await claimGoogleOAuth(config, actor, 'calendar', String(body.state || ''), code);
        if ('receipt' in attempt) return config.json(attempt.receipt);
        const credential = await googleOAuthToken(config, actor, 'calendar', attempt, code);
        let query = db.from('calendar_connections').select('id,account_email,calendar_id,provider_account_id')
          .eq('user_id', user.id).eq('provider', 'google');
        query = attempt.company ? query.eq('company_id', attempt.company) : query.is('company_id', null);
        const current = await query.limit(1).maybeSingle();
        if (current.error) throw new GoogleIntegrationError('google_connection_unavailable', 503);
        if (current.data?.account_email && (current.data.account_email.toLowerCase() !== credential.account_email ||
          current.data.provider_account_id && current.data.provider_account_id !== credential.provider_account_id)) {
          throw new GoogleIntegrationError('google_account_mismatch', 409);
        }
        const calendar = current.data?.calendar_id || 'primary';
        config.assertCalendar(calendar);
        return config.json(await finishGoogleOAuth(actor, attempt.nonce, current.data?.id || null, calendar, credential));
      });
    }
    if (action === 'disconnect') {
      return await withGoogleLease(db, 'oauth:' + user.id, async () => {
        let query = db.from('calendar_connections').delete().eq('user_id', user.id).eq('provider', 'google');
        query = companyId ? query.eq('company_id', companyId) : query.is('company_id', null);
        const removed = await query;
        if (removed.error) throw new GoogleIntegrationError('google_connection_unavailable', 503);
        await revokeUnusedGoogleCredential(config, actor, `${user.id}:${companyId || 'self'}`);
        return config.json({ ok: true });
      });
    }
    if (!['sync_event', 'cancel_event', 'delete_event'].includes(action)) return config.json({ error: 'unknown_action' }, 400);
    const id = String(body.eventId || '');
    if (!/^[a-f0-9-]{36}$/.test(id)) return config.json({ error: 'missing_event_id' }, 400);
    const reason = String(body.reason || '').trim();
    if (action === 'delete_event' && reason.length < 2) return config.json({ error: 'delete_reason_required' }, 400);
    return await withGoogleLease(db, 'calendar:' + id, async () => {
      const event = await calendarEvent(actor, id);
      if (profile.role !== 'admin' && event.created_by !== user.id) {
        if (action === 'sync_event') return config.json({ status: 'managed_by_cali' });
        throw new GoogleIntegrationError('event_access_denied', 403);
      }
      if (action === 'sync_event' && event.source_type === 'scheduling_request' && !event.google_event_id) {
        return config.json({ status: 'deferred_to_scheduling_sync' });
      }
      const connection = event.source_type === 'scheduling_request'
        ? await calendarConnection(db, event)
        : await calendarConnection(db, event, user.id, profile.role === 'admin' ? null : profile.company_id);
      if (action === 'sync_event') {
        if (!connection) {
          if (!event.google_event_id) await db.from('events').update({ sync_status: 'local' }).eq('id', event.id);
          return config.json({ status: 'no_google_connection' });
        }
        return config.json(await syncCalendarEvent(config, db, event, connection));
      }

      if (!connection && event.google_event_id) return config.json({ status: 'connection_missing' }, 409);
      if (connection) await deleteCalendarEvent(config, db, event, connection);
      if (action === 'cancel_event') {
        const status = connection ? 'cancelled_google' : 'local';
        const changed = await db.from('events').update({ sync_status: status, updated_at: new Date().toISOString() }).eq('id', id);
        if (changed.error) throw new GoogleIntegrationError('event_changed_retry', 409);
        return config.json({ status: connection ? 'cancelled_google' : 'not_synced' });
      }

      const attendees = await db.from('event_attendees').select('*').eq('event_id', id);
      if (attendees.error) throw new GoogleIntegrationError('event_attendees_unavailable', 503);
      const audit = await db.from('activity_log').insert({
        company_id: event.company_id || null, actor_user_id: user.id, event_type: 'calendar_event_deleted',
        entity_type: 'event', entity_id: id, metadata: {
          reason, event_snapshot: event, attendees_snapshot: attendees.data || [], google_deleted: Boolean(connection),
        },
      });
      if (audit.error) throw new GoogleIntegrationError('event_audit_unavailable', 503);
      const removed = await db.from('events').delete().eq('id', id);
      if (removed.error) throw new GoogleIntegrationError('event_delete_failed', 503);
      return config.json({ status: 'deleted' });
    });
  } catch (error) {
    return googleFailure(config, error);
  }
});
