'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, user, tables } = require('./fixtures.cjs');

const endpoint = 'https://cali-local-qa.supabase.co/rest/v1/';
const company = 'Empresa QA fictícia';

function mock(context, origin, table, method, handle, accepts = () => true) {
  return context.route(
    (url) => url.href.startsWith(endpoint) && url.pathname === '/rest/v1/' + table && accepts(url),
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const result = handle(request, new URL(request.url()));
      const headers = { 'access-control-allow-origin': origin };
      return result === undefined
        ? route.fulfill({ status: 204, headers })
        : route.fulfill({ json: result.data, status: result.status ?? 200, headers });
    },
  );
}

async function companyTab(page, origin, name) {
  await page.goto(origin + '/admin/clientes');
  await page.getByRole('button', { name: 'Editar ' + company, exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Gerenciar ' + company, exact: true });
  await sheet.getByRole('tab', { name, exact: true }).click();
  return sheet;
}

const cases = [
  {
    id: 'company-agenda-contract-defaults-and-retry',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const writes = [];
      const persisted = { ...tables.companies[0], meeting_sessions_included_per_month: 1, meeting_cadence_days: 30, onsite_visits_included_per_month: 0 };
      await mock(context, origin, 'companies', 'GET', () => ({ data: [persisted] }),
        (url) => url.searchParams.get('select')?.startsWith('service_plan,meeting_sessions'));
      await mock(context, origin, 'companies', 'PATCH', (request, url) => {
        assert.equal(url.searchParams.get('id'), 'eq.' + companyId);
        const body = request.postDataJSON();
        writes.push(body);
        if (writes.length === 1) return { status: 409, data: { message: 'Agenda alterada durante a edição' } };
        Object.assign(persisted, body);
        return undefined;
      });
      const sheet = await companyTab(page, origin, 'Agenda do contrato');
      const plan = sheet.getByRole('combobox', { name: 'Pacote' });
      const count = sheet.getByRole('spinbutton', { name: 'Encontros por mês' });
      const cadence = sheet.getByRole('spinbutton', { name: 'Dias entre encontros' });
      const visits = sheet.getByRole('spinbutton', { name: 'Visitas presenciais incluídas por mês' });
      const save = sheet.getByRole('button', { name: 'Salvar agenda do contrato' });
      assert.equal(await plan.inputValue(), 'partner');
      await plan.selectOption('full');
      assert.deepEqual(await Promise.all([count.inputValue(), cadence.inputValue(), visits.inputValue()]), ['2', '14', '1']);
      await count.fill('13');
      await save.click();
      assert.equal(await count.evaluate((field) => field.validity.rangeOverflow), true);
      assert.deepEqual(writes, []);
      await count.fill('2');
      await save.click();
      await sheet.getByText('Agenda alterada durante a edição').waitFor();
      assert.equal(await plan.inputValue(), 'full');
      await save.click();
      await sheet.getByText('Agenda do contrato atualizada.').waitFor();
      const expected = {
        service_plan: 'full', meeting_sessions_included_per_month: 2, meeting_cadence_days: 14,
        onsite_visits_included_per_month: 1, fixed_meeting_required: true, meeting_mode_policy: 'mixed_one_onsite',
      };
      assert.deepEqual(writes, [expected, expected]);
      await sheet.getByRole('tab', { name: 'Dados cadastrais' }).click();
      await sheet.getByRole('tab', { name: 'Agenda do contrato' }).click();
      assert.equal(await plan.inputValue(), 'full');
      await snapshot('agenda-reloaded', sheet);
    },
  },
  {
    id: 'company-fronts-scope-and-history',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const contractId = 'd3110000-0000-4000-8000-000000000001';
      const catalog = [
        { code: 'core', title: 'Núcleo QA', category: 'recurring', partner_core: true, partner_slot: true },
        { code: 'selection_vacancy', title: 'Seleção por vaga QA', category: 'vacancy', partner_slot: true },
        { code: 'unavailable', title: 'Frente indisponível QA', category: 'recurring' },
      ];
      const rows = [];
      const writes = [];
      await mock(context, origin, 'front_catalog', 'GET', () => ({ data: catalog }));
      await mock(context, origin, 'company_fronts', 'GET', (_, url) => {
        assert.equal(url.searchParams.get('company_id'), 'eq.' + companyId);
        return { data: rows };
      });
      await mock(context, origin, 'company_fronts', 'POST', (request) => {
        const body = request.postDataJSON();
        writes.push(body);
        rows.push({ ...body, id: contractId, status: 'active' });
      });
      await mock(context, origin, 'company_fronts', 'PATCH', (request, url) => {
        assert.equal(url.searchParams.get('id'), 'eq.' + contractId);
        const body = request.postDataJSON();
        writes.push(body);
        Object.assign(rows[0], body);
      });
      const sheet = await companyTab(page, origin, 'Frentes');
      const front = sheet.getByRole('combobox', { name: 'Frente', exact: true });
      await front.waitFor();
      assert.deepEqual(await front.getByRole('option').allTextContents(), ['Selecione', 'Seleção por vaga QA']);
      await front.selectOption('selection_vacancy');
      const activate = sheet.getByRole('button', { name: 'Ativar frente' });
      await activate.click();
      await sheet.getByRole('alert').filter({ hasText: /Identifique a vaga/ }).waitFor();
      assert.deepEqual(writes, []);
      await sheet.getByRole('textbox', { name: 'Escopo da vaga' }).fill(' Analista QA ');
      await activate.click();
      const close = sheet.getByRole('button', { name: 'Encerrar Analista QA' });
      await close.waitFor();
      await snapshot('frente-ativa', sheet);
      await close.click();
      await sheet.getByText('Frente encerrada. O histórico permanece registrado.').waitFor();
      assert.equal(await close.count(), 0);
      assert.deepEqual(writes, [
        { company_id: companyId, front_code: 'selection_vacancy', mode: 'slot_paid', scope_label: 'Analista QA', ends_at: null },
        { status: 'ended' },
      ]);
    },
  },
  {
    id: 'privacy-request-keyboard-answer-retry',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const id = 'aa330000-0000-4000-8000-000000000001';
      const row = {
        id, company_id: companyId, user_id: user.id, kind: 'access', status: 'open',
        details: 'Solicitação sintética para conferir a resposta.', answer: null, resolved_at: null,
        created_at: '2026-10-01T15:00:00Z',
      };
      const answers = [];
      await mock(context, origin, 'data_subject_requests', 'GET', () => row.status === 'answered'
        ? { status: 503, data: { message: 'Falha na releitura de teste.' } }
        : { data: [row] });
      await mock(context, origin, 'rpc/admin_answer_data_subject_request', 'POST', (request) => {
        const body = request.postDataJSON();
        answers.push(body);
        if (answers.length === 1) return { status: 503, data: { message: 'Serviço de teste indisponível' } };
        Object.assign(row, { status: 'answered', answer: body.p_answer, resolved_at: '2026-11-12T16:00:00Z' });
        return { data: null };
      });
      await page.clock.setFixedTime(new Date('2026-11-12T16:00:00Z'));
      await page.goto(origin + '/admin/auditoria');
      const panel = page.getByRole('region', { name: 'Pedidos de privacidade' });
      const reply = panel.getByRole('button', { name: 'Responder' });
      await reply.press('Enter');
      const field = panel.getByRole('textbox', { name: 'Resposta ao pedido' });
      assert.equal(await field.evaluate((element) => element === document.activeElement), true);
      await panel.getByRole('button', { name: 'Cancelar' }).click();
      assert.equal(await reply.evaluate((element) => element === document.activeElement), true);
      await reply.press('Enter');
      const send = panel.getByRole('button', { name: 'Enviar resposta' });
      assert.equal(await send.isDisabled(), true);
      await field.fill(' Resposta de teste registrada. ');
      await snapshot('resposta-focada', panel);
      await send.click();
      await panel.getByRole('alert').filter({ hasText: 'Serviço de teste indisponível' }).waitFor();
      assert.equal(await field.inputValue(), ' Resposta de teste registrada. ');
      await send.click();
      await panel.getByText('Nenhum pedido em aberto.').waitFor();
      await panel.getByText('Resposta de teste registrada.', { exact: false }).waitFor();
      assert.equal(await reply.count(), 0);
      assert.deepEqual(answers, Array(2).fill({ p_request_id: id, p_answer: 'Resposta de teste registrada.' }));
    },
  },
];

browserSuite(cases).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
