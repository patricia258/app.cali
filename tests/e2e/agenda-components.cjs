'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';

function intercept(context, origin, path, method, respond) {
  return context.route(
    (url) => url.origin === host && url.pathname === path,
    (route) => {
      if (route.request().method() !== method) return route.fallback();
      const result = respond(route.request());
      if (!result) return route.fallback();
      const { json, status = 200 } = result;
      return route.fulfill({ status, json, headers: { 'access-control-allow-origin': origin } });
    },
  );
}

browserSuite([
  {
    id: 'agenda-admin-decision-retry-and-google-pending',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const changeId = 'c6110000-0000-4000-8000-000000000001';
      const eventId = 'c6110000-0000-4000-8000-000000000002';
      const row = {
        id: changeId, event_id: eventId, company_id: companyId, action: 'reschedule',
        reason: 'Conflito de teste com outra reunião.', status: 'pending', created_at: '2026-11-11T15:00:00Z',
        original_starts_at: '2026-11-20T14:00:00Z',
        slots: [
          { startsAt: '2026-11-23T13:00:00Z', endsAt: '2026-11-23T14:00:00Z' },
          { startsAt: '2026-11-24T14:00:00Z', endsAt: '2026-11-24T15:00:00Z' },
        ],
      };
      const decisions = [];
      const sync = [];
      await intercept(context, origin, '/rest/v1/agenda_change_requests', 'GET', () => ({ json: [row] }));
      await intercept(context, origin, '/rest/v1/rpc/admin_decide_agenda_change_v1', 'POST', (request) => {
        decisions.push(request.postDataJSON());
        if (decisions.length === 1) return { status: 409, json: { message: 'Tente novamente depois de atualizar a agenda.' } };
        row.status = 'approved';
        return { json: { event_id: eventId, action: 'reschedule' } };
      });
      await intercept(context, origin, '/functions/v1/google-calendar-oauth', 'POST', (request) => {
        const body = request.postDataJSON();
        if (body?.action !== 'sync_event' || body.eventId !== eventId) return;
        sync.push(body);
        return { json: { status: 'deferred_to_scheduling_sync' } };
      });
      await intercept(context, origin, '/functions/v1/workspace-sync-scheduled-event', 'POST', (request) => {
        sync.push(request.postDataJSON());
        return { status: 503, json: { error: 'Google indisponível no cenário de teste.' } };
      });
      await page.goto(origin + '/admin/calendario');
      const trigger = page.getByRole('button', { name: /Alterações de reuniões/ });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Reagendar reunião' });
      await dialog.getByText('Motivo do cliente: Conflito de teste com outra reunião.').waitFor();
      await dialog.getByRole('radio', { name: /24 de novembro/ }).check();
      const note = dialog.getByRole('textbox', { name: 'Resposta ao cliente' });
      await note.fill('Confirmada a segunda opção de horário.');
      await snapshot('decisao-de-agenda', dialog);
      const send = dialog.getByRole('button', { name: 'Enviar resposta' });
      await send.click();
      await dialog.getByRole('alert').filter({ hasText: 'Tente novamente' }).waitFor();
      assert.deepEqual(sync, []);
      assert.equal(await note.inputValue(), 'Confirmada a segunda opção de horário.');
      await send.click();
      await dialog.waitFor({ state: 'detached' });
      const pending = page.getByRole('status').filter({ hasText: 'A sincronização com o Google ficou pendente.' });
      await pending.waitFor();
      assert.equal(await trigger.isDisabled(), true);
      assert.deepEqual(decisions, Array(2).fill({
        p_change_id: changeId, p_approve: true, p_note: 'Confirmada a segunda opção de horário.', p_slot_index: 1,
      }));
      assert.deepEqual(sync, [{ action: 'sync_event', eventId }, { eventId }]);
    },
  },
  {
    id: 'calendar-client-disconnect-confirmation-and-scope',
    role: 'client',
    async run({ context, page, origin, snapshot }) {
      const requests = [];
      const reads = [];
      let connected = true;
      await intercept(context, origin, '/rest/v1/calendar_connections', 'GET', (request) => {
        const params = new URL(request.url()).searchParams;
        reads.push([params.get('company_id'), params.get('user_id'), params.get('provider')]);
        return { json: connected ? [{ id: 'calendar-qa', account_email: 'agenda@example.test', status: 'connected', sync_enabled: true }] : [] };
      });
      await intercept(context, origin, '/functions/v1/google-calendar-oauth', 'POST', (request) => {
        const body = request.postDataJSON();
        if (body?.action !== 'disconnect') return;
        requests.push(body);
        connected = false;
        return { json: { connected: false } };
      });
      await page.goto(origin + '/cliente/cronograma');
      await page.getByText('Integração com Google Agenda', { exact: true }).click();
      const panel = page.locator('.client-google-panel');
      await panel.getByText(/Conectado a agenda@example.test/).waitFor();
      await snapshot('google-conectado', panel);
      const disconnect = panel.getByRole('button', { name: 'Desconectar', exact: true });
      page.once('dialog', (confirmation) => confirmation.dismiss());
      await disconnect.click();
      assert.deepEqual(requests, []);
      assert.equal(await disconnect.isVisible(), true);
      page.once('dialog', (confirmation) => confirmation.accept());
      await disconnect.click();
      await panel.getByRole('button', { name: 'Conectar Google Calendar' }).waitFor();
      assert.deepEqual(requests, [{ action: 'disconnect', companyId }]);
      assert.ok(reads.some((read) => read[0] === 'eq.' + companyId && read[1] === 'eq.' + user.id && read[2] === 'eq.google'));
      await snapshot('google-desconectado', panel);
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
