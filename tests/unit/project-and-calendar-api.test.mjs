import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actorId, workspaceHttp } from './helpers/workspace-http.mjs';

const projectId = '1c801da1-47c0-44df-bb47-73d1ea39cd76';
const deliverableId = '2c801da1-47c0-44df-bb47-73d1ea39cd76';
const companyId = '3c801da1-47c0-44df-bb47-73d1ea39cd76';
const eventId = '4c801da1-47c0-44df-bb47-73d1ea39cd76';
const now = '2026-11-12T15:00:00Z';
const rpc = (name) => `/rest/v1/rpc/${name}`;

test('aprovação e ajuste do entregável transportam a revisão e a data selecionadas', async (t) => {
  const http = await workspaceHttp(t);
  const { approveClientDeliveryReview, requestClientDeliveryAdjustment } = await http.load('projects/client-delivery.ts');
  await http.signIn();
  const target = { id: deliverableId, revision: 2, requestedAt: now };
  http.respond(rpc('client_approve_deliverable_review_v2'), { already_approved: true });
  assert.equal((await approveClientDeliveryReview(target, 5, null)).data.already_approved, true);
  http.respond(rpc('client_request_deliverable_adjustment_v2'), { code: '40001', message: 'Revisão atualizada' }, { status: 409 });
  assert.equal((await requestClientDeliveryAdjustment(target, 'Atualizar anexo')).error.code, '40001');
  const context = { p_deliverable_id: deliverableId, p_review_revision: 2, p_review_requested_at: now };
  assert.deepEqual(http.requests.slice(1).map(({ body }) => body), [
    { ...context, p_score: 5, p_comment: null }, { ...context, p_reason: 'Atualizar anexo' },
  ]);
});

test('histórico de entregas consulta só o projeto selecionado e informa recusa de leitura', async (t) => {
  const http = await workspaceHttp(t);
  const { readProjectPerformance } = await http.load('projects/performance.ts');
  const path = '/rest/v1/deliverable_delivery_performance';
  const row = { project_id: projectId, deliverable_id: deliverableId, title: 'Entrega aprovada', status: 'approved', total_minutes: 0 };
  const signal = new AbortController().signal;
  http.respond(path, [row], { method: 'GET' });
  assert.deepEqual(await readProjectPerformance(projectId, signal), [row]);
  assert.equal(http.requests[0].url.searchParams.get('project_id'), `eq.${projectId}`);
  http.respond(path, { message: 'Projeto indisponível' }, { method: 'GET', status: 403 });
  await assert.rejects(readProjectPerformance(projectId, signal), { message: 'Projeto indisponível' });
});

test('reparo do calendário limita aos eventos recentes e pendentes do ator autenticado', async (t) => {
  const http = await workspaceHttp(t);
  const { listMyPendingCalendarEvents, runGoogleCalendarOperation } = await http.load('calendar/sync.ts');
  await http.signIn();
  const events = '/rest/v1/events';
  const google = '/functions/v1/google-calendar-oauth';
  http.respond('/auth/v1/user', http.user, { method: 'GET' });
  http.respond(events, [{ id: eventId, sync_status: 'pending' }], { method: 'GET' });
  assert.deepEqual(await listMyPendingCalendarEvents(now), [{ id: eventId, sync_status: 'pending' }]);
  const filters = http.requests.find(({ url }) => url.pathname === events).url.searchParams;
  assert.equal(filters.get('created_by'), `eq.${actorId}`);
  assert.equal(filters.get('sync_status'), 'in.(pending,error)');
  assert.equal(filters.get('created_at'), `gte.${now}`);
  assert.equal(filters.get('cancelled_at'), 'is.null');
  assert.equal(filters.get('limit'), '10');
  http.respond(google, { error: 'auth', detail: 'Conta de agenda desconectada' });
  await assert.rejects(runGoogleCalendarOperation({ action: 'sync_event', eventId }), /Conta de agenda desconectada/);
  assert.deepEqual(http.requests.at(-1).body, { action: 'sync_event', eventId });
});

test('regra de agenda conserva a projeção do cliente e o contrato de resultado por origem', async (t) => {
  const http = await workspaceHttp(t);
  const { readSchedulingRequestPolicies } = await http.load('calendar/requests.ts');
  const { recordMeetingOutcome } = await http.load('calendar/meetings.ts');
  const requests = '/rest/v1/scheduling_requests';
  http.respond(requests, [{ id: eventId, company_id: companyId, extra_visit: true }], { method: 'GET' });
  await readSchedulingRequestPolicies(true);
  http.respond(requests, [], { method: 'GET' });
  await readSchedulingRequestPolicies(false);
  assert.match(http.requests[0].url.searchParams.get('select'), /,extra_visit$/);
  assert.doesNotMatch(http.requests[1].url.searchParams.get('select'), /,extra_visit$/);
  assert.deepEqual(http.requests.slice(0, 2).map(({ url }) => url.searchParams.get('limit')), ['30', '60']);

  http.respond(rpc('admin_mark_scheduling_event_outcome_v1'), { status: 'completed' });
  await recordMeetingOutcome(eventId, true, true, null, false, '');
  http.respond(rpc('admin_mark_calendar_event_outcome_v66'), { outcome: 'not_occurred' });
  await recordMeetingOutcome(eventId, false, false, 'external', true, 'Agenda indisponível');
  assert.deepEqual(http.requests.slice(2).map(({ body }) => body), [
    { p_event_id: eventId, p_outcome: 'occurred', p_reason_category: null, p_justified: false, p_note: '', p_convert_to_virtual: false },
    { p_event_id: eventId, p_outcome: 'not_occurred', p_reason_category: 'external', p_justified: true, p_note: 'Agenda indisponível' },
  ]);
});
