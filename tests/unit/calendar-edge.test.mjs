import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api, handler, request, transport } from './support/edge-runtime.mjs';

const client = 'a1000000-0000-4000-8000-000000000001';
const company = 'a1000000-0000-4000-8000-000000000002';
const session = 'a1000000-0000-4000-8000-000000000003';
const eventId = 'a1000000-0000-4000-8000-000000000004';
const connectionId = 'a1000000-0000-4000-8000-000000000005';
const auth = `Bearer header.${Buffer.from(JSON.stringify({ session_id: session })).toString('base64url')}.signature`;
const google = 'http://google-qa:9000';
const scope = 'https://www.googleapis.com/auth/calendar.readonly';
const email = 'cliente-a@example.test';
const organizer = 'admin@example.test';
const meeting = 'https://meet.google.com/test-qa-meet';
const eventLink = 'https://calendar.google.com/event?eid=qa';
const calendar = {
  id: connectionId, calendar_id: 'qa-calendar', credential_key: 'qa-credential',
  account_email: organizer, provider_account_id: 'qa-google-account',
};
const credential = {
  account_email: organizer, provider_account_id: calendar.provider_account_id,
  scope, access_token: 'qa-google-token', expires_at: '2099-01-01T00:00:00Z',
};
const start = '2026-11-13T15:00:00.000Z';
const end = '2026-11-13T16:00:00.000Z';
const initialEvent = {
  id: eventId, company_id: company, source_type: 'scheduling_request', source_entity_id: session,
  title: 'Atendimento QA', mode: 'remote', starts_at: start, ends_at: end,
  google_connection_id: connectionId, updated_at: '2026-11-12T10:00:00Z',
};

function withClient(t, respond) {
  return transport(t, async req => {
    const url = new URL(req.url);
    if (url.origin === api) {
      if (url.pathname === '/auth/v1/user') {
        assert.equal(req.headers.get('authorization'), auth);
        return Response.json({ id: client, email });
      }
      if (url.pathname === '/rest/v1/rpc/workspace_private_access_v2') {
        assert.equal(req.headers.get('authorization'), auth);
        assert.equal(req.headers.get('content-profile'), 'cali_workspace');
        return Response.json(true);
      }
      if (url.pathname === '/rest/v1/profiles') {
        assert.equal(req.headers.get('authorization'), 'Bearer qa-service');
        assert.equal(url.searchParams.get('id'), `eq.${client}`);
        return Response.json([{ id: client, role: 'client', company_id: company, active: true }]);
      }
    } else {
      assert.equal(url.origin, google);
      assert.equal(req.headers.get('authorization'), 'Bearer qa-google-token');
      assert.equal(req.redirect, 'error');
    }
    return respond(req, url);
  });
}

function clientRequest(endpoint, body) {
  return request(endpoint, { body, headers: { Authorization: auth } });
}

test('Calendar lê a conta do Cliente, filtra eventos cancelados e recusa escopo insuficiente', async t => {
  const endpoint = 'workspace-google-calendar-read';
  const run = await handler(endpoint);
  let hasScope = false;
  let providerCalls = 0;
  withClient(t, (req, url) => {
    const { pathname, searchParams } = url;
    if (url.origin === google) providerCalls++;
    switch (pathname) {
      case '/rest/v1/calendar_connections':
        assert.equal(searchParams.get('user_id'), `eq.${client}`);
        assert.equal(searchParams.get('company_id'), `eq.${company}`);
        assert.equal(searchParams.get('status'), 'eq.connected');
        return Response.json([calendar]);
      case '/rest/v1/google_calendar_credentials':
        assert.equal(searchParams.get('credential_key'), `eq.${calendar.credential_key}`);
        return Response.json([{ ...credential, scope: hasScope ? scope : 'different-scope' }]);
      case '/calendar/v3/users/me/calendarList':
        return Response.json({ items: [{ id: calendar.calendar_id }, { id: 'deleted', deleted: true }] });
      case '/calendar/v3/colors':
        return Response.json({ event: { 7: { background: '#123456' } } });
      case '/calendar/v3/calendars/qa-calendar/events':
        assert.equal(searchParams.get('timeMin'), start);
        assert.equal(searchParams.get('timeMax'), end);
        return Response.json({ items: [
          { id: 'event-a', summary: 'Agenda do Cliente', start: { dateTime: start }, end: { dateTime: end }, colorId: '7' },
          { id: 'cancelled', status: 'cancelled', start: { dateTime: start } },
        ] });
      default: assert.fail(`Unexpected Calendar read request ${req.url}`);
    }
  });
  const body = { action: 'client_events', start, end };
  const forbidden = await run(clientRequest(endpoint, { ...body, action: 'events' }));
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: 'access_denied' });
  assert.deepEqual(await (await run(clientRequest(endpoint, body))).json(), { state: 'reconnect_required' });
  assert.equal(providerCalls, 0);
  hasScope = true;
  const result = await (await run(clientRequest(endpoint, body))).json();
  assert.equal(result.state, 'checked');
  assert.equal(result.events.length, 1);
  const [item] = result.events;
  assert.deepEqual([item.id, item.calendarId, item.title, item.color], ['event-a', calendar.calendar_id, 'Agenda do Cliente', '#123456']);
  assert.equal(providerCalls, 3);
});

test('Calendar atualiza presença e Meet após conferir vínculo e oculta convidados externos do Cliente', async t => {
  const endpoint = 'google-calendar-refresh-event';
  const run = await handler(endpoint);
  let linked = company;
  let localWrites = 0;
  let releases = 0;
  withClient(t, async (req, url) => {
    const { pathname, searchParams } = url;
    switch (pathname) {
      case '/rest/v1/rpc/lease_google_operation': return Response.json(true);
      case '/rest/v1/rpc/release_google_operation':
        releases++;
        return Response.json(true);
      case '/rest/v1/events':
        assert.equal(searchParams.get('id'), `eq.${eventId}`);
        if (req.headers.get('authorization') === auth) {
          assert.equal(req.method, 'GET');
          return Response.json([{ id: eventId }]);
        }
        if (req.method === 'GET') return Response.json([{ ...initialEvent, google_event_id: 'event-qa' }]);
        assert.equal(req.method, 'PATCH');
        assert.equal(searchParams.get('updated_at'), `eq.${initialEvent.updated_at}`);
        assert.equal((await req.json()).meeting_url, meeting);
        localWrites++;
        return new Response(null, { status: 204 });
      case '/rest/v1/calendar_connections':
        assert.equal(searchParams.get('id'), `eq.${connectionId}`);
        return Response.json([calendar]);
      case '/rest/v1/google_calendar_credentials': return Response.json([credential]);
      case '/calendar/v3/calendars/qa-calendar/events/event-qa':
        return Response.json({ extendedProperties: { private: { caliWorkspaceEventId: linked } }, hangoutLink: meeting, htmlLink: eventLink,
          organizer: { email: organizer }, attendees: [{ email, responseStatus: 'accepted' }, { email: 'externo@example.test', responseStatus: 'accepted' }] });
      case '/rest/v1/event_attendees':
        if (req.method === 'GET') return Response.json([{ id: session, email, status: 'pending', attendee_type: 'client' }]);
        assert.equal(searchParams.get('id'), `eq.${session}`);
        assert.equal((await req.json()).status, 'accepted');
        localWrites++;
        return new Response(null, { status: 204 });
      case '/rest/v1/rpc/notify_workspace_movement': {
        const notice = await req.json();
        assert.equal(notice.p_company_id, company);
        assert.equal(notice.p_entity_id, eventId);
        assert.equal(notice.p_target, 'admin');
        localWrites++;
        return Response.json(null);
      }
      default: assert.fail(`Unexpected Calendar refresh request ${req.url}`);
    }
  });
  const wrong = await run(clientRequest(endpoint, { eventId }));
  assert.equal(wrong.status, 409);
  assert.deepEqual(await wrong.json(), { error: 'google_event_link_mismatch' });
  assert.equal(localWrites, 0);
  linked = eventId;
  const refreshed = await (await run(clientRequest(endpoint, { eventId }))).json();
  assert.equal(refreshed.status, 'refreshed');
  assert.equal(refreshed.meetingUrl, meeting);
  assert.deepEqual(refreshed.attendees, [{ email, status: 'accepted' }, { email: organizer, status: 'accepted' }]);
  assert.equal(localWrites, 3);
  assert.equal(releases, 2);
});

test('Calendar sincroniza agendamento visível, cria Meet sem convite externo e mantém o mesmo evento no retry', async t => {
  const endpoint = 'workspace-sync-scheduled-event';
  const run = await handler(endpoint);
  let visible = false;
  let hasOutsideGuest = false;
  let local = initialEvent;
  let remote = null;
  let remoteWrites = 0;
  let localWrites = 0;
  let releases = 0;
  withClient(t, async (req, url) => {
    const { pathname, searchParams } = url;
    switch (pathname) {
      case '/rest/v1/rpc/lease_google_operation': return Response.json(true);
      case '/rest/v1/rpc/release_google_operation':
        releases++;
        return Response.json(true);
      case '/rest/v1/events': {
        assert.equal(searchParams.get('id'), `eq.${eventId}`);
        if (req.headers.get('authorization') === auth) return Response.json(visible ? [{ id: eventId }] : []);
        if (req.method === 'GET') return Response.json([local]);
        assert.equal(req.method, 'PATCH');
        assert.equal(searchParams.get('updated_at'), `eq.${local.updated_at}`);
        assert.equal(searchParams.get('cancelled_at'), 'is.null');
        local = { ...local, ...await req.json() };
        localWrites++;
        return Response.json([{ id: eventId }]);
      }
      case '/rest/v1/calendar_connections':
        return req.method === 'PATCH' ? new Response(null, { status: 204 }) : Response.json([calendar]);
      case '/rest/v1/google_calendar_credentials': return Response.json([credential]);
      case '/rest/v1/event_attendees': return Response.json([
        { email }, { email: organizer }, ...(hasOutsideGuest ? [{ email: 'externo@example.test' }] : []),
      ]);
      case '/calendar/v3/calendars/qa-calendar/events': {
        assert.equal(req.method, 'POST');
        assert.equal(searchParams.get('sendUpdates'), 'none');
        const input = await req.json();
        assert.equal(input.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
        assert.deepEqual(input.attendees, [{ email }]);
        assert.equal(input.extendedProperties.private.caliWorkspaceEventId, eventId);
        assert.equal(input.extendedProperties.private.caliSchedulingRequestId, session);
        remote = { ...input, hangoutLink: meeting, htmlLink: eventLink };
        remoteWrites++;
        return Response.json(remote);
      }
      default:
        assert.match(pathname, /\/calendar\/v3\/calendars\/qa-calendar\/events\/cali[0-9a-f]{32}$/);
        assert.equal(req.method, 'GET');
        return remote ? Response.json(remote) : Response.json({}, { status: 404 });
    }
  });
  const denied = await run(clientRequest(endpoint, { eventId }));
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: 'event_access_denied' });
  assert.equal(localWrites + remoteWrites, 0);
  visible = true;
  hasOutsideGuest = true;
  const outsideGuest = await run(clientRequest(endpoint, { eventId }));
  assert.equal(outsideGuest.status, 403);
  assert.deepEqual(await outsideGuest.json(), { error: 'google_attendee_not_allowed' });
  assert.equal(localWrites + remoteWrites, 0);
  hasOutsideGuest = false;
  const first = await (await run(clientRequest(endpoint, { eventId }))).json();
  const retry = await (await run(clientRequest(endpoint, { eventId }))).json();
  assert.equal(first.status, 'synced');
  assert.equal(first.meetingUrl, meeting);
  assert.equal(first.googleEventId, local.google_event_id);
  assert.deepEqual(retry, first);
  assert.equal(remoteWrites, 1);
  assert.equal(localWrites, 2);
  assert.equal(releases, 4);
});
