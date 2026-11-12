import assert from 'node:assert/strict';
import authFixture from '../e2e/browser-fixture.cjs';

export const supabaseOrigin = 'https://cali-local-qa.supabase.co';
const bucketPath = '/storage/v1/object/cali-workspace-private';
const visit = { id: 'visit-qa', title: 'Visita concluída QA', company_id: 'company-qa', selected_slot: null };
const receipt = 'extra-visits/company-qa/visit-qa/comprovante.pdf';
const company = { id: visit.company_id, display_name: 'Empresa QA' };
const destination = '/destino?filtro=um&filtro=dois#selecionado';
const fixedDate = new Date('2030-01-01T15:00:00.000Z');

async function withCalendar(context, page, origin) {
  const session = authFixture.makeSession();
  const state = {
    calls: [],
    busy: false,
    failSave: false,
    attachmentFailure: null,
    expenses: [],
    holdAvailability: null,
  };
  await page.clock.setFixedTime(fixedDate);
  await context.addInitScript(
    ({ origin, storageKey, session }) => {
      if (location.origin === origin) localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { origin, storageKey: authFixture.sessionKey, session },
  );
  await context.route(
    (url) => url.origin === supabaseOrigin,
    async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();
      const headers = {
        'access-control-allow-origin': origin,
        'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*',
        'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const contentType = req.headers()['content-type'] || '';
      const body = contentType.includes('application/json') ? req.postDataJSON() : null;
      state.calls.push({ path, method, body, search: url.searchParams });
      const respond = (json, status = 200) => route.fulfill({ status, headers, json });
      if (path === '/auth/v1/user') return respond(session.user);
      if (path === '/rest/v1/profiles') return respond([{ company_id: company.id }]);
      if (path === '/rest/v1/companies') return respond([company]);
      if (path === '/rest/v1/scheduling_requests') return respond([visit]);
      if (path === '/rest/v1/extra_visit_expenses') return respond(state.expenses);
      if (path === '/functions/v1/workspace-google-calendar-read') {
        await state.holdAvailability;
        return respond({ state: 'checked', slots: [{ busy: state.busy }, { busy: false }] });
      }
      if (path === '/rest/v1/rpc/create_extra_visit_request_v1') return respond('request-qa');
      if (path === '/rest/v1/rpc/client_request_online_extra_v2') return respond('request-qa');
      if (path === '/rest/v1/rpc/attach_extra_visit_request_v1') {
        return state.attachmentFailure === 'vínculo'
          ? respond({ code: 'P0001', message: 'Vínculo recusado pela fixture' }, 400)
          : respond(true);
      }
      if (path === '/rest/v1/rpc/admin_record_extra_visit_expenses_v2') {
        if (state.failSave) return respond({ code: 'P0001', message: 'Despesas rejeitadas pela fixture' }, 400);
        state.expenses = [
          {
            id: 'expense-qa',
            request_id: visit.id,
            expense_kind: 'transport',
            amount_cents: 3510,
            receipt_path: receipt,
            protocol: 'DESP-QA-01',
            hours_quantity: null,
          },
        ];
        return respond([{ protocol: 'DESP-QA-01' }, { protocol: 'DESP-QA-02' }]);
      }
      if (path === '/storage/v1/object/sign/cali-workspace-private/' + receipt) {
        return respond({ signedURL: '/object/sign/receipt-fixture' });
      }
      if (path.startsWith(bucketPath + '/') && method === 'POST') {
        return state.attachmentFailure === 'upload'
          ? respond({ error: 'Forbidden', message: 'Upload recusado pela fixture' }, 403)
          : respond({ Key: path.slice('/storage/v1/object/'.length) });
      }
      if (path === bucketPath && method === 'DELETE') return respond([]);
      return respond({ message: 'Requisição fora do contrato da fixture' }, 404);
    },
  );
  return state;
}

function calls(state, path, method = 'POST') {
  return state.calls.filter((entry) => entry.path === path && entry.method === method);
}

async function slots(dialog, dates, times) {
  for (let index = 0; index < 2; index++) {
    await dialog.getByLabel('Data', { exact: true }).nth(index).fill(dates[index]);
    await dialog.getByLabel('Início', { exact: true }).nth(index).fill(times[index]);
  }
}

async function consent(dialog, name) {
  const submit = dialog.getByRole('button', { name: 'Enviar para análise' });
  assert(await submit.isDisabled());
  await dialog.getByLabel('Seu nome completo').fill(name);
  await dialog.getByRole('checkbox', { name: /Estou ciente|Entendi que/ }).check();
  return submit;
}

async function visitDetails(page) {
  await page.getByRole('button', { name: /Agende aqui um papo/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Visita presencial na sede/ }).click();
  await dialog.getByText('R$ 800,00 por até 4 horas').waitFor();
  await dialog.getByRole('button', { name: /Escolher datas/ }).click();
  await dialog.getByText(company.display_name, { exact: true }).waitFor();
  for (const [label, value] of [
    ['Rua', 'Rua QA'],
    ['Número', '12'],
    ['Bairro', 'Centro'],
    ['Cidade / UF', 'São Paulo / SP'],
    ['CEP', '01000-000'],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  return dialog;
}

export function registerCalendarNavigation(component) {
  component(
    'ExtraVisitRequest · sugere horário online, valida opções e confirma conflito',
    'request',
    async (page, state) => {
      state.busy = true;
      await page.getByRole('button', { name: 'Horário da agenda' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /Bate-papo online/ }).click();
      await dialog.getByRole('button', { name: /Escolher datas/ }).click();
      await dialog.getByText(company.display_name, { exact: true }).waitFor();
      assert.equal(await dialog.getByLabel('Duração prevista').inputValue(), '90');
      assert.equal(await dialog.getByLabel('Data', { exact: true }).first().inputValue(), '2030-01-08');
      assert.equal(await dialog.getByLabel('Início', { exact: true }).first().inputValue(), '10:00');
      const review = dialog.getByRole('button', { name: /Revisar pedido/ });
      await slots(dialog, ['2030-01-02', '2030-01-09'], ['10:00', '14:00']);
      await review.click();
      assert.match(await dialog.getByRole('alert').textContent(), /48 horas/);
      await slots(dialog, ['2030-01-05', '2030-01-09'], ['10:00', '14:00']);
      await review.click();
      assert.match(await dialog.getByRole('alert').textContent(), /segunda a sexta/);
      await slots(dialog, ['2030-01-08', '2030-01-08'], ['10:00', '10:00']);
      await review.click();
      assert.match(await dialog.getByRole('alert').textContent(), /duas opções diferentes/);
      await slots(dialog, ['2030-01-08', '2030-01-09'], ['10:00', '14:00']);
      await review.click();
      await dialog.getByText('Duração: 1h30 · valor R$ 300.').waitFor();
      const submit = await consent(dialog, 'Cliente Fixture');
      const rpc = '/rest/v1/rpc/client_request_online_extra_v2';
      await submit.click();
      assert.match(await dialog.getByRole('alert').textContent(), /compromisso/);
      assert.equal(calls(state, rpc).length, 0);
      await dialog.getByRole('checkbox', { name: /avalie esses horários/ }).check();
      const hold = Promise.withResolvers();
      state.holdAvailability = hold.promise;
      try {
        const pending = page.waitForRequest((request) =>
          request.url().endsWith('/workspace-google-calendar-read'),
        );
        await submit.click();
        await pending;
        assert(await dialog.getByRole('button', { name: 'Enviando…' }).isDisabled());
        await page.keyboard.press('Escape');
        assert(await dialog.isVisible());
        await dialog.locator('form').evaluate((form) => form.requestSubmit());
      } finally {
        hold.resolve();
      }
      await page.getByRole('heading', { name: 'Cronograma fixture' }).waitFor();
      const requested = [
        { startsAt: '2030-01-08T13:00:00.000Z', endsAt: '2030-01-08T14:30:00.000Z' },
        { startsAt: '2030-01-09T17:00:00.000Z', endsAt: '2030-01-09T18:30:00.000Z' },
      ];
      const availability = calls(state, '/functions/v1/workspace-google-calendar-read');
      assert.equal(availability.length, 3);
      for (const check of availability) assert.deepEqual(check.body, { action: 'availability', slots: requested });
      assert.deepEqual(
        calls(state, rpc).map(({ body }) => body),
        [
          {
            p_title: 'Reunião online extra',
            p_purpose: '',
            p_slots: requested,
            p_ack_name: 'Cliente Fixture',
            p_acknowledged: true,
          },
        ],
      );
    },
    withCalendar,
  );

  component(
    'ExtraVisitRequest · exige justificativa de segunda, envia endereço e vincula PDF privado',
    'request',
    async (page, state) => {
      const dialog = await visitDetails(page);
      await slots(dialog, ['2030-01-07', '2030-01-08'], ['09:00', '12:00']);
      const reason = dialog.getByLabel(/Por que a segunda-feira/);
      const review = dialog.getByRole('button', { name: /Revisar pedido/ });
      await review.click();
      assert(await reason.evaluate((element) => !element.validity.valid));
      await reason.fill('Equipe completa disponível');
      await dialog.getByLabel('Objetivo e observações').fill('Revisar operação');
      const attachment = dialog.getByLabel(/Anexo, se desejar/);
      await attachment.setInputFiles({
        name: 'teste.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('QA'),
      });
      assert.match(await dialog.getByRole('alert').textContent(), /PDF ou imagem/);
      await attachment.setInputFiles({
        name: 'Ata de reunião.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-qa'),
      });
      await review.click();
      await dialog.getByText('Segunda-feira: sujeita à confirmação da CALI.').waitFor();
      await (await consent(dialog, 'Cliente Fixture')).click();
      await page.getByRole('heading', { name: 'Cronograma fixture' }).waitFor();
      assert.deepEqual(
        calls(state, '/rest/v1/rpc/create_extra_visit_request_v1').map(({ body }) => body),
        [
          {
            p_title: 'Visita presencial extra',
            p_purpose: 'Revisar operação\nSegunda-feira solicitada: Equipe completa disponível',
            p_location: 'Rua QA, 12 · Centro · São Paulo / SP · CEP 01000-000',
            p_requested_slots: [
              { startsAt: '2030-01-07T12:00:00.000Z', endsAt: '2030-01-07T16:00:00.000Z' },
              { startsAt: '2030-01-08T15:00:00.000Z', endsAt: '2030-01-08T19:00:00.000Z' },
            ],
            p_ack_name: 'Cliente Fixture',
            p_acknowledged: true,
          },
        ],
      );
      const uploads = state.calls.filter(
        ({ path, method }) => path.startsWith(bucketPath + '/') && method === 'POST',
      );
      assert.equal(uploads.length, 1);
      const stored = uploads[0].path.slice(bucketPath.length + 1);
      assert.match(stored, /^extra-visit-requests\/company-qa\/request-qa\/[\da-f-]{36}-Ata_de_reuni_o\.pdf$/);
      assert.deepEqual(
        calls(state, '/rest/v1/rpc/attach_extra_visit_request_v1').map(({ body }) => body),
        [
          {
            p_request_id: 'request-qa',
            p_path: stored,
            p_name: 'Ata de reunião.pdf',
          },
        ],
      );
    },
    withCalendar,
  );

  for (const [stage, message] of [
    ['upload', 'recebido'],
    ['vínculo', 'vinculado'],
  ]) {
    component(
      `ExtraVisitRequest · falha no ${stage} preserva o único pedido criado`,
      'request',
      async (page, state) => {
        state.attachmentFailure = stage;
        const dialog = await visitDetails(page);
        await slots(dialog, ['2030-01-08', '2030-01-09'], ['09:00', '10:00']);
        await dialog.getByLabel(/Anexo, se desejar/).setInputFiles({
          name: 'ata.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-qa'),
        });
        await dialog.getByRole('button', { name: /Revisar pedido/ }).click();
        await (await consent(dialog, 'Cliente Fixture')).click();
        const alert = dialog.getByRole('alert');
        await alert.waitFor();
        assert((await alert.textContent()).startsWith(`Pedido enviado. O anexo não foi ${message}`));
        const create = '/rest/v1/rpc/create_extra_visit_request_v1';
        const links = calls(state, '/rest/v1/rpc/attach_extra_visit_request_v1');
        const deletions = calls(state, bucketPath, 'DELETE').map(({ body }) => body);
        if (stage === 'vínculo') {
          assert.equal(links.length, 1);
          assert.deepEqual(deletions, [{ prefixes: [links[0].body.p_path] }]);
        } else {
          assert.equal(links.length, 0);
          assert.equal(deletions.length, 0);
        }
        assert.equal(await dialog.getByRole('button', { name: 'Enviar para análise' }).count(), 0);
        await dialog.locator('form').evaluate((form) => form.requestSubmit());
        await dialog.getByRole('button', { name: 'Entendi, fechar' }).click();
        await dialog.waitFor({ state: 'detached' });
        assert.equal(calls(state, create).length, 1);
        await visitDetails(page);
        assert.equal(await dialog.getByLabel(/Anexo, se desejar/).inputValue(), '');
        assert.equal(await alert.count(), 0);
      },
      withCalendar,
    );
  }

  component(
    'ExtraVisitExpenses · valida linhas, remove upload na falha e repete com protocolo',
    'expenses',
    async (page, state) => {
      const trigger = page.getByRole('button', { name: 'Despesas das visitas extras' });
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Despesas de visitas extras' });
      await dialog.getByRole('option', { name: /Visita concluída QA/ }).waitFor({ state: 'attached' });
      const visits = calls(state, '/rest/v1/scheduling_requests', 'GET');
      assert.equal(visits[0].search.get('extra_visit'), 'eq.true');
      assert.equal(visits[0].search.get('status'), 'eq.completed');
      const amount = dialog.getByLabel('Valor (R$)', { exact: true });
      const submit = dialog.getByRole('button', { name: 'Registrar despesas' });
      await amount.fill('0');
      await submit.click();
      assert.match(await dialog.getByRole('alert').textContent(), /valor válido/);
      await amount.fill('35,10');
      await dialog.getByRole('button', { name: 'Adicionar linha' }).click();
      await dialog.getByRole('button', { name: 'Remover linha 2' }).click();
      assert.equal(await amount.inputValue(), '35,10');
      await dialog.getByRole('button', { name: 'Adicionar linha' }).click();
      await dialog.getByRole('combobox', { name: /^Tipo/ }).first().selectOption('extra_hours');
      await amount.first().fill('240,75');
      await dialog.getByLabel('Quantidade de horas').fill('1.5');
      await dialog.getByLabel('Orçamento aprovado em').fill('sim');
      await submit.click();
      assert.match(await dialog.getByRole('alert').textContent(), /onde o orçamento foi aprovado/);
      await dialog.getByLabel('Orçamento aprovado em').fill('Proposta QA 012');
      const file = dialog.getByLabel(/Comprovante/).last();
      await file.setInputFiles({ name: 'arquivo.txt', mimeType: 'text/plain', buffer: Buffer.from('QA') });
      await submit.click();
      assert.match(await dialog.getByRole('alert').textContent(), /PDF ou imagem/);
      const rpc = '/rest/v1/rpc/admin_record_extra_visit_expenses_v2';
      assert.equal(calls(state, rpc).length, 0);
      await file.setInputFiles({
        name: 'comprovante.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-qa'),
      });
      state.failSave = true;
      await submit.click();
      await dialog.getByText('Não foi possível registrar as despesas.').waitFor();
      const failedItems = calls(state, rpc)[0].body.p_items;
      assert.deepEqual(
        calls(state, bucketPath, 'DELETE').map(({ body }) => body),
        [{ prefixes: [failedItems[1].receiptPath] }],
      );
      state.failSave = false;
      await submit.click();
      assert.match(await dialog.getByRole('status').textContent(), /2 linhas registradas.*DESP-QA-01.*DESP-QA-02/);
      const requests = calls(state, rpc);
      assert.equal(requests.length, 2);
      const saved = requests[1].body;
      assert.equal(saved.p_request_id, visit.id);
      assert.deepEqual(saved.p_items[0], {
        kind: 'extra_hours',
        amountCents: 24075,
        receiptPath: null,
        note: '',
        hoursQuantity: 1.5,
        approvedQuoteNote: 'Proposta QA 012',
      });
      assert.match(
        saved.p_items[1].receiptPath,
        /^extra-visits\/company-qa\/visit-qa\/[\da-f-]{36}-comprovante\.pdf$/,
      );
      assert.notEqual(saved.p_items[1].receiptPath, failedItems[1].receiptPath);
      assert.equal(saved.p_items[1].amountCents, 3510);
      assert.equal(await amount.inputValue(), '');
      const signature = page.waitForRequest((req) => req.url().includes('/storage/v1/object/sign/'));
      await dialog.getByRole('button', { name: /Ver anexo/ }).click();
      assert.deepEqual((await signature).postDataJSON(), { expiresIn: 120 });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate((element) => element === document.activeElement));
    },
    withCalendar,
  );

  component(
    'Link · URL completa, back/forward, clique no mesmo destino sem duplicar histórico',
    'navigation',
    async (page) => {
      const historyLength = () => page.evaluate(() => history.length);
      const initialLength = await historyLength();
      await page.getByRole('link', { name: 'Destino interno' }).press('Enter');
      await page.getByRole('heading', { name: 'Destino fixture' }).waitFor();
      assert(page.url().endsWith(destination));
      assert.equal(await historyLength(), initialLength + 1);
      await page.getByRole('link', { name: 'Mesmo destino' }).click();
      assert.equal(await historyLength(), initialLength + 1);
      await page.goBack();
      await page.getByRole('heading', { name: 'Início fixture' }).waitFor();
      assert(page.url().endsWith('/?fixture=navigation'));
      await page.goForward();
      await page.getByRole('heading', { name: 'Destino fixture' }).waitFor();
      assert(page.url().endsWith(destination));
    },
  );

  component(
    'Link · preserva clique cancelado, modificado, download, alvo e URLs externas',
    'navigation',
    async (page) => {
      const initial = page.url();
      await page.getByRole('link', { name: 'Cancelar navegação' }).click();
      assert.equal(await page.getByLabel('Cancelamentos').textContent(), '1');
      for (const [name, options, href] of [
        ['Destino interno', { ctrlKey: true }, destination],
        ['Destino interno', { metaKey: true }, destination],
        ['Destino interno', { shiftKey: true }, destination],
        ['Destino interno', { altKey: true }, destination],
        ['Destino interno', { button: 1 }, destination],
        ['Nova aba', {}, destination],
        ['Download nativo', {}, '/fixture-download.txt'],
        ['URL externa', {}, 'https://navigation.example.invalid/destino'],
        ['URL sem protocolo', {}, '//navigation.example.invalid/destino'],
      ]) {
        const native = await page.getByRole('link', { name }).evaluate((anchor, options) => {
          let alreadyPrevented;
          window.addEventListener(
            'click',
            (event) => {
              alreadyPrevented = event.defaultPrevented;
              event.preventDefault();
            },
            { once: true },
          );
          anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...options }));
          return { alreadyPrevented, href: anchor.getAttribute('href') };
        }, options);
        assert.deepEqual(native, { alreadyPrevented: false, href }, name);
      }
      assert.equal(await page.getByRole('link', { name: 'Nova aba' }).getAttribute('target'), '_blank');
      assert.equal(
        await page.getByRole('link', { name: 'Download nativo' }).getAttribute('download'),
        'fixture.txt',
      );
      assert.equal(page.url(), initial);
    },
  );

  for (const [action, delta] of [
    ['Redirecionar e manter origem', 1],
    ['Redirecionar substituindo origem', 0],
  ]) {
    component(`Navigate · ${action} preserva parâmetros repetidos e hash`, 'navigation', async (page) => {
      const historyLength = () => page.evaluate(() => history.length);
      const initialLength = await historyLength();
      await page.getByRole('button', { name: action }).click();
      await page.getByRole('heading', { name: 'Destino fixture' }).waitFor();
      assert(page.url().endsWith(destination));
      assert.equal(await historyLength(), initialLength + delta);
      if (delta) {
        await page.goBack();
        await page.getByRole('heading', { name: 'Início fixture' }).waitFor();
      }
    });
  }
}
