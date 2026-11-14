'use strict';

const assert = require('node:assert/strict');
const { answerWorkspaceDialog, browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

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
    id: 'agenda-client-proposal-acknowledgement-retry-and-sync',
    role: 'client',
    width: 390,
    async run({ context, page, origin, snapshot }) {
      const row = {
        id: 'c6110000-0000-4000-8000-000000000011', company_id: companyId, requested_by: user.id,
        request_mode: 'remote', title: 'Reunião QA com ciência', status: 'client_review',
        urgency_fee_applies: true, admin_note: 'Escolha a melhor opção.',
        admin_proposed_slots: [{ startsAt: '2026-11-23T13:00:00Z', endsAt: '2026-11-23T14:00:00Z' }],
      };
      const writes = [];
      const sync = [];
      await intercept(context, origin, '/rest/v1/scheduling_requests', 'GET', () => ({ json: [row] }));
      await intercept(context, origin, '/rest/v1/rpc/client_accept_scheduling_proposal_v2', 'POST', (request) => {
        writes.push(request.postDataJSON());
        if (writes.length === 1) return { status: 409, json: { message: 'Agenda em atualização. Tente novamente.' } };
        row.status = 'confirmed';
        return { json: { event_id: 'agenda-qa-event' } };
      });
      await intercept(context, origin, '/functions/v1/workspace-sync-scheduled-event', 'POST', (request) => {
        sync.push(request.postDataJSON());
        return { status: 503, json: { error: 'google_unavailable' } };
      });
      await page.goto(origin + '/cliente/cronograma?request=' + row.id);
      const panel = page.locator('#scheduling-v65-client-host');
      const accept = panel.getByRole('button', { name: /^Aceitar/ });
      await accept.waitFor();
      const card = panel.getByRole('article');
      assert(await card.evaluate((element) => element === document.activeElement));
      await snapshot('proposta', panel);
      await accept.click();
      await page.getByRole('alert').filter({ hasText: 'Registre sua ciência' }).waitFor();
      assert.deepEqual(writes, []);
      await panel.getByRole('checkbox', { name: /Li e estou ciente/ }).check();
      await accept.click();
      await page.getByRole('alert').filter({ hasText: 'Agenda em atualização.' }).waitFor();
      await accept.click();
      await panel.waitFor({ state: 'hidden' });
      await page.getByText(/Horário confirmado/).waitFor();
      const feedback = await page.getByText(/Horário confirmado/).innerText();
      assert.match(feedback, /sincronização com o Google ficou pendente/, JSON.stringify({ writes, sync, feedback }));
      assert.deepEqual(writes, Array(2).fill({ p_request_id: row.id, p_slot_index: 0, p_billing_acknowledged: true }));
      assert.deepEqual(sync, [{ eventId: 'agenda-qa-event' }]);
    },
  },
  {
    id: 'agenda-admin-request-drawer-and-counteroffer-retry',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const slot = { startsAt: '2026-11-23T13:00:00Z', endsAt: '2026-11-23T14:00:00Z' };
      const row = {
        id: 'c6110000-0000-4000-8000-000000000012', company_id: companyId, requested_by: user.id,
        request_mode: 'remote', title: 'Pedido QA pendente', status: 'submitted', requested_slots: [slot],
      };
      const writes = [];
      const logoPath = '/storage/v1/object/sign/cali-workspace-private/qa-agenda/company.svg';
      const company = { ...tables.companies[0], logo_url: 'private:qa-agenda/company.svg' };
      await intercept(context, origin, '/rest/v1/companies', 'GET', (request) => (
        new URL(request.url()).searchParams.get('select')?.includes('onsite_visits_included_per_month') ? { json: [company] } : null
      ));
      await context.route((url) => url.origin === host && url.pathname === logoPath, (route) => {
        const request = route.request();
        const headers = {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
        };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (request.method() === 'POST') return route.fulfill({ headers, json: { signedURL: logoPath.replace('/storage/v1', '') + '?token=agenda-qa' } });
        return route.fulfill({ headers, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#723043"/></svg>' });
      });
      await intercept(context, origin, '/rest/v1/scheduling_requests', 'GET', () => ({ json: [row] }));
      await intercept(context, origin, '/rest/v1/rpc/admin_respond_scheduling_request_v1', 'POST', (request) => {
        writes.push(request.postDataJSON());
        if (writes.length === 1) return { status: 409, json: { message: 'Não consegui salvar as opções.' } };
        row.status = 'client_review';
        row.admin_proposed_slots = writes.at(-1).p_proposed_slots;
        return { json: { status: row.status } };
      });
      await page.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));
      await page.goto(origin + '/admin/calendario');
      const trigger = page.getByRole('button', { name: 'Solicitações de agenda', exact: true });
      await trigger.click();
      const drawer = page.getByRole('dialog', { name: 'Pedidos de agenda' });
      await drawer.getByRole('heading', { name: row.title }).waitFor();
      const companyLogo = drawer.getByRole('img', { name: `Logo de ${company.display_name}` });
      assert.match(await companyLogo.getAttribute('src'), /company\.svg\?token=agenda-qa$/);
      await snapshot('gaveta', drawer);
      await drawer.getByRole('button', { name: 'Sugerir datas' }).click();
      const form = page.getByRole('dialog', { name: 'Sugerir outros horários' });
      await form.getByLabel('Data da opção 1').fill('2026-11-23');
      await form.getByLabel('Hora da opção 1').fill('10:00');
      await form.getByLabel('Mensagem para o cliente').fill('Consegue neste horário?');
      await form.getByRole('button', { name: 'Enviar opções' }).click();
      await form.getByRole('alert').getByText('Não consegui salvar as opções.').waitFor();
      assert.equal(await form.getByLabel('Data da opção 1').inputValue(), '2026-11-23');
      await form.getByRole('button', { name: 'Enviar opções' }).click();
      await form.waitFor({ state: 'hidden' });
      await drawer.getByText('Aguardando resposta do cliente.').waitFor();
      assert.deepEqual(writes, Array(2).fill({
        p_request_id: row.id, p_proposed_slots: [{ startsAt: '2026-11-23T13:00:00.000Z', endsAt: '2026-11-23T14:00:00.000Z' }],
        p_note: 'Consegue neste horário?', p_decline: false,
      }));
      await drawer.getByRole('button', { name: 'Fechar' }).press('Escape');
      await drawer.waitFor({ state: 'hidden' });
    },
  },
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
      const panel = page.getByRole('region', { name: 'Conexão com Google Calendar' });
      await panel.getByText(/Conectado a agenda@example.test/).waitFor();
      await snapshot('google-conectado', panel);
      const disconnect = panel.getByRole('button', { name: 'Desconectar', exact: true });
      await disconnect.click();
      await answerWorkspaceDialog(page, false);
      assert.deepEqual(requests, []);
      assert.equal(await disconnect.isVisible(), true);
      await disconnect.click();
      await answerWorkspaceDialog(page, true);
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
