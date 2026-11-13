'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

browserSuite([
  {
    id: '09-admin-calendar-create-edit-cancel-and-retry',
    role: 'admin',
    async run({ page, context, origin }) {
      const host = 'https://cali-local-qa.supabase.co';
      const id = '99999995-9999-4999-8999-999999999999';
      const date = '2026-11-13';
      const now = '2026-11-12T16:00:00.000Z';
      const title = 'Reunião de indicadores QA';
      const edited = 'Reunião de indicadores remarcada QA';
      const originalGuest = 'cliente@example.invalid';
      const newGuest = 'equipe@example.invalid';
      const reason = 'Mudança de disponibilidade QA.';
      const writes = [];
      let event;
      let attendees = [];
      let creates = 0;
      let cancellations = 0;
      let syncCalls = 0;
      const headers = { 'access-control-allow-origin': origin };
      const logoSource = host + '/qa-calendar-original.svg';
      const logoFallback = tables.companies[0].logo_workspace_url;
      await context.route(logoSource, (route) => route.fulfill({ status: 404 }));
      await context.route(
        (url) => url.origin === host && url.pathname === '/rest/v1/companies' && url.searchParams.get('select') === 'id,display_name,logo_url,logo_workspace_url',
        (route) => route.fulfill({ headers, json: [{ ...tables.companies[0], logo_url: logoSource }] }),
      );
      await context.route(
        (url) => url.origin === host && url.pathname === '/rest/v1/events',
        (route) => {
          const request = route.request();
          if (request.method() === 'GET') return route.fulfill({ headers, json: event ? [event] : [] });
          assert.equal(request.headers()['content-profile'], 'cali_workspace');
          const body = request.postDataJSON();
          writes.push([request.method(), body]);
          if (request.method() === 'POST') {
            if (++creates === 1)
              return route.fulfill({ headers, status: 503, json: { message: 'Falha temporária ao criar' } });
            event = { ...body, id, protocol: 'CALI-EVT-20261113-001' };
            return route.fulfill({ headers, json: { id, protocol: event.protocol } });
          }
          assert.equal(request.method(), 'PATCH');
          assert.equal(new URL(request.url()).searchParams.get('id'), 'eq.' + id);
          if (body.cancelled_at && ++cancellations === 1) {
            return route.fulfill({ headers, status: 503, json: { message: 'Falha temporária ao cancelar' } });
          }
          event = { ...event, ...body };
          return route.fulfill({ headers, json: null });
        },
      );
      await context.route(
        (url) => url.origin === host && url.pathname === '/rest/v1/event_attendees',
        (route) => {
          const request = route.request();
          if (request.method() === 'GET') return route.fulfill({ headers, json: attendees });
          if (request.method() === 'DELETE') {
            assert.equal(new URL(request.url()).searchParams.get('event_id'), 'eq.' + id);
            writes.push(['DELETE attendees', id]);
            attendees = [];
          } else {
            assert.equal(request.method(), 'POST');
            const body = request.postDataJSON();
            writes.push(['POST attendees', body]);
            attendees = body.map((item, index) => ({ ...item, id: 'qa-attendee-' + index }));
          }
          return route.fulfill({ headers, json: null });
        },
      );
      await context.route(
        (url) => url.origin === host && url.pathname === '/functions/v1/workspace-sync-scheduled-event',
        (route) => {
          syncCalls++;
          return route.fulfill({
            headers,
            status: 503,
            json: { error: 'Provedor desconectado no caso de agenda local' },
          });
        },
      );

      await page.clock.setFixedTime(new Date(now));
      await page.goto(origin + '/admin/calendario');
      await page.getByRole('button', { name: 'Lista', exact: true }).click();
      await page.getByRole('button', { name: 'Novo evento', exact: true }).click();
      const create = page.getByRole('dialog', { name: 'Adicionar ao calendário', exact: true });
      const add = create.getByRole('button', { name: 'Adicionar evento' });
      assert(await add.isDisabled());
      await create.getByRole('combobox', { name: /^Cliente/ }).selectOption(companyId);
      await create.getByRole('textbox', { name: 'Título' }).fill('  ' + title + '  ');
      await create.getByLabel('Data', { exact: true }).fill(date);
      await create.getByLabel('Início', { exact: true }).fill('10:15');
      await create.getByLabel('Término', { exact: true }).fill('11:00');
      await create.getByText('Local, link, convidados e descrição', { exact: true }).click();
      const guestInput = (dialog) => dialog.getByPlaceholder('decisor@empresa.com.br, outra@empresa.com.br');
      const reminder = (dialog) => dialog.getByRole('combobox', { name: /^Lembrete/ });
      const transcription = (dialog) => dialog.getByRole('checkbox', { name: /^Transcrição automática/ });
      await guestInput(create).fill(originalGuest);
      await reminder(create).selectOption('15');
      await transcription(create).uncheck();
      await add.click();
      await create.getByRole('alert').filter({ hasText: 'Não foi possível salvar o evento.' }).waitFor();
      assert.equal(await guestInput(create).inputValue(), originalGuest);
      assert.equal(await reminder(create).inputValue(), '15');
      assert.equal(await transcription(create).isChecked(), false);
      assert.equal(writes.length, 1);
      await add.click();
      await create.waitFor({ state: 'hidden' });
      const events = page.locator('.calendar-agenda-view');
      const originalLogo = page.waitForResponse((response) => response.url() === logoSource);
      await events.getByRole('button', { name: new RegExp(title) }).click();
      const detail = page.getByRole('dialog', { name: title, exact: true });
      await detail.getByText(originalGuest, { exact: true }).waitFor();
      assert.equal((await originalLogo).status(), 404);
      const logo = detail.locator('.calendar-detail-company-mark img');
      await page.waitForFunction((source) => document.querySelector('.calendar-detail-company-mark img')?.getAttribute('src') === source, logoFallback);
      assert.equal(await logo.evaluate((image) => getComputedStyle(image).objectFit), 'contain');
      await detail.getByRole('button', { name: 'Editar ou remarcar' }).click();
      const edit = page.getByRole('dialog', { name: 'Atualizar compromisso', exact: true });
      assert.equal(await edit.getByLabel('Início', { exact: true }).inputValue(), '10:15');
      assert.equal(await guestInput(edit).inputValue(), originalGuest);
      assert.equal(await reminder(edit).inputValue(), '15');
      assert.equal(await transcription(edit).isChecked(), false);
      await edit.getByRole('textbox', { name: 'Título' }).fill(edited);
      await edit.getByLabel('Início', { exact: true }).fill('14:00');
      await edit.getByLabel('Término', { exact: true }).fill('14:45');
      await guestInput(edit).fill(newGuest);
      await reminder(edit).selectOption('60');
      await transcription(edit).check();
      await edit.getByRole('button', { name: 'Salvar alterações' }).click();
      await edit.waitFor({ state: 'hidden' });
      const updated = events.getByRole('button', { name: new RegExp(edited) });
      await updated.click();
      const updatedDetail = page.getByRole('dialog', { name: edited, exact: true });
      await updatedDetail.getByText(newGuest, { exact: true }).waitFor();
      assert.equal(await updatedDetail.getByText(originalGuest, { exact: true }).count(), 0);
      await updatedDetail.getByRole('button', { name: 'Cancelar', exact: true }).click();
      const cancel = updatedDetail.getByRole('button', { name: 'Confirmar cancelamento' });
      const note = updatedDetail.getByPlaceholder('Motivo do cancelamento');
      assert(await cancel.isDisabled());
      await note.fill('  ' + reason + '  ');
      await cancel.click();
      await updatedDetail.getByRole('alert').filter({ hasText: 'Não foi possível cancelar o evento.' }).waitFor();
      assert.equal(await note.inputValue(), '  ' + reason + '  ');
      assert.equal(event.cancelled_at, undefined);
      await cancel.click();
      await updatedDetail.waitFor({ state: 'hidden' });
      await updated.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: /Histórico de reuniões/ }).click();
      const history = page.getByRole('dialog', { name: 'Histórico de reuniões', exact: true });
      const cancelled = history.getByRole('button', { name: new RegExp(edited) });
      assert.match(await cancelled.innerText(), /Cancelada/);
      // O runtime antigo atualizava preferências 700 ms após cada submit, mesmo se a gravação falhasse.
      await page.waitForTimeout(800);

      const [initial, created, firstGuests, update, deleteGuests, newGuests, failedCancel, savedCancel] = writes;
      assert.equal(writes.length, 8, JSON.stringify(writes));
      assert.deepEqual(initial, created);
      assert.equal(created[0], 'POST');
      assert.equal(created[1].company_id, companyId);
      assert.equal(created[1].created_by, user.id);
      assert.equal(created[1].title, title);
      assert.equal(created[1].starts_at, date + 'T10:15:00-03:00');
      assert.equal(created[1].ends_at, date + 'T11:00:00-03:00');
      assert.equal(created[1].sync_status, 'local');
      assert.equal(created[1].reminder_minutes, 15);
      assert.equal(created[1].auto_transcription, false);
      assert.deepEqual(firstGuests, [
        'POST attendees',
        [
          {
            event_id: id,
            company_id: companyId,
            name: 'cliente',
            email: originalGuest,
            attendee_type: 'client',
            status: 'pending',
          },
        ],
      ]);
      assert.equal(update[0], 'PATCH');
      assert.equal(update[1].title, edited);
      assert.equal(update[1].starts_at, date + 'T14:00:00-03:00');
      assert.equal(update[1].reminder_minutes, 60);
      assert.equal(update[1].auto_transcription, true);
      assert.equal(event.reminder_minutes, 60);
      assert.equal(event.auto_transcription, true);
      assert.deepEqual(deleteGuests, ['DELETE attendees', id]);
      assert.deepEqual(newGuests, ['POST attendees', [{ ...firstGuests[1][0], name: 'equipe', email: newGuest }]]);
      assert.deepEqual(failedCancel, savedCancel);
      assert.deepEqual(savedCancel, ['PATCH', { cancelled_at: now, cancellation_reason: reason }]);
      assert.equal(syncCalls, 0);
      return {
        persistedEvent: id,
        attendeeReplaced: true,
        bothRetries: true,
        historyAfterCancel: true,
        atomicMeetingPreferences: true,
        googleWrites: 0,
      };
    },
  },
  {
    id: 'agenda-cliente-solicitar-agendamento',
    role: 'client',
    width: 390,
    input: 'touch',
    async run({ page, origin, snapshot }) {
      await page.goto(origin + '/cliente/cronograma');
      const trigger = page.getByRole('button', { name: 'Solicitar agendamento', exact: true });
      await trigger.tap();
      const chooser = page.getByRole('dialog', { name: 'Que tipo de papo você deseja?' });
      await chooser.getByRole('button', { name: /Visita presencial na sede/ }).waitFor();
      await chooser.getByRole('button', { name: /Bate-papo online/ }).tap();
      const online = page.getByRole('dialog', { name: 'Vamos marcar um papo online?' });
      await online.getByText('R$ 300 por 1h30').waitFor();
      await snapshot('solicitar-agendamento');
      await online.getByRole('button', { name: 'Fechar', exact: true }).tap();
      await online.waitFor({ state: 'detached' });
      assert.equal(await page.getByRole('dialog').count(), 0);
    },
  },
  {
    id: 'agenda-admin-despesas-visitas-concluidas',
    role: 'admin',
    async run({ page, origin, snapshot }) {
      await page.goto(origin + '/admin/calendario');
      const trigger = page.getByRole('button', { name: 'Despesas das visitas extras', exact: true });
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Despesas de visitas extras', exact: true });
      await dialog.getByRole('button', { name: 'Adicionar linha' }).waitFor();
      assert(await dialog.getByRole('button', { name: 'Registrar despesas' }).isDisabled());
      await snapshot('despesas');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate((button) => button === document.activeElement));
    },
  },
  {
    id: 'agenda-partner-sem-registro-administrativo-de-despesas',
    role: 'partner',
    async run({ page, origin }) {
      await page.goto(origin + '/equipe/calendario');
      await page.getByRole('heading', { name: 'Calendário.' }).waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Despesas das visitas extras', exact: true }).count(),
        0,
      );
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
