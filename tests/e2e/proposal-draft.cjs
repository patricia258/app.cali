'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');

const fixtureHost = 'https://cali-local-qa.supabase.co';
const submissionId = 'c0111111-1111-4111-8111-111111111121';
const archivedId = 'c0111111-1111-4111-8111-111111111122';
const draftId = 'c0111111-1111-4111-8111-111111111123';
const clock = '2026-11-12T16:00:00.000Z';
const protocol = 'CALI-PROP-RECALCULO-QA';

function portal(context, origin, resource, method, respond) {
  return context.route(
    (url) => url.origin === fixtureHost && url.pathname === '/rest/v1/' + resource,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      assert.equal(request.headers()['accept-profile'], 'public');
      assert.match(request.headers().authorization, /^Bearer /);
      const { json, status = 200 } = respond(request, new URL(request.url()).searchParams);
      return route.fulfill({
        status,
        json,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
        },
      });
    },
  );
}

const currency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  .format(value).replace(/\s+/g, ' ');

async function readMoney(locator, expected) {
  await locator.waitFor();
  assert.equal((await locator.innerText()).replace(/\s+/g, ' ').trim(), currency(expected));
}

browserSuite([
  {
    id: '03-admin-proposal-search-calculate-save-retry-and-reopen',
    role: 'admin',
    async run({ page, context, origin }) {
      const companyName = 'Empresa recálculo QA';
      const submission = {
        id: submissionId,
        protocol,
        service_slug: 'assessoria-estrategica',
        status: 'enviada',
        contact_name: 'Decisora QA',
        contact_role: 'Diretoria',
        contact_email: 'decisora@example.invalid',
        company_name: companyName,
        company_location: 'Curitiba/PR',
        answers: { colaboradores: 60, frequencia: 'quinzenal', frentes: ['lideranca', 'processos', 'cultura'] },
        lgpd_accepted: true,
        created_at: clock,
        updated_at: clock,
      };
      const archived = {
        id: archivedId,
        submission_id: submissionId,
        service_slug: submission.service_slug,
        version: 3,
        package_code: 'PARTNER',
        base_price: 4200,
        extras: 0,
        discount_pct: 0,
        contract_months: 8,
        validity_days: 15,
        subtotal: 4200,
        final_unit: 4200,
        total_value: 4200,
        calculator_data: { manualFinal: false, contextSummary: 'Versão arquivada QA.' },
        scope_items: ['Escopo arquivado QA'],
        status: 'enviada',
        pdf_path: 'qa/proposta-v3.pdf',
        sent_at: clock,
        created_at: clock,
        updated_at: clock,
      };
      const original = structuredClone(archived);
      const pricing = [
        { id: 'qa-partner', package_code: 'PARTNER', package_label: 'CALI PARTNER', base_price: 4200, sort_order: 1 },
        { id: 'qa-full', package_code: 'FULL', package_label: 'CALI FULL', base_price: 7600, sort_order: 2 },
      ].map((rule) => ({ ...rule, service_slug: submission.service_slug, config: {}, active: true }));
      let draft = null;
      const inserts = [];
      const edits = [];
      const contactUpdates = [];

      await page.clock.setFixedTime(new Date(clock));
      await portal(context, origin, 'cali_submissions', 'GET', (_, params) => ({
        json: params.has('id') ? [submission].filter((item) => params.get('id') === 'eq.' + item.id) : [
          submission,
          { ...submission, id: 'c0111111-1111-4111-8111-111111111124', protocol: 'CALI-PROP-OUTRA-QA', company_name: 'Outra empresa QA' },
        ],
      }));
      await portal(context, origin, 'cali_submissions', 'PATCH', (request, params) => {
        assert.equal(params.get('id'), 'eq.' + submissionId);
        const patch = request.postDataJSON();
        contactUpdates.push(patch);
        Object.assign(submission, patch);
        return { json: [submission] };
      });
      await portal(context, origin, 'cali_proposals', 'GET', (_, params) => {
        const versions = [draft, archived].filter(Boolean);
        return {
          json: params.has('id')
            ? versions.filter((row) => params.get('id') === 'eq.' + row.id).map((row) => ({ ...row, submission }))
            : versions,
        };
      });
      await portal(context, origin, 'cali_proposals', 'POST', (request) => {
        const proposal = request.postDataJSON();
        inserts.push(proposal);
        if (inserts.length === 1) return { status: 503, json: { message: 'Portal ocupado QA. Tente novamente.' } };
        draft = { ...proposal, id: draftId, created_at: clock };
        return { json: [draft] };
      });
      await portal(context, origin, 'cali_proposals', 'PATCH', (request, params) => {
        assert.equal(params.get('id'), 'eq.' + draftId);
        const update = request.postDataJSON();
        edits.push(update);
        draft = { ...draft, ...update };
        return { json: [draft] };
      });
      await portal(context, origin, 'cali_pricing_rules', 'GET', () => ({ json: pricing }));

      await page.goto(origin + '/admin/propostas');
      const search = page.getByRole('textbox', { name: 'Buscar oportunidades', exact: true });
      const briefing = page.getByRole('button', { name: 'Abrir briefing', exact: true });
      await page.getByText('Outra empresa QA', { exact: true }).waitFor();
      await search.fill('sem oportunidade');
      await page.getByText('Nenhuma oportunidade encontrada.', { exact: true }).waitFor();
      await search.fill(protocol);
      assert.equal(await briefing.count(), 1);
      await briefing.click();
      await page.getByRole('button', { name: 'Criar nova versão', exact: true }).click();

      await page.getByRole('heading', { name: 'Construir proposta', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/admin/propostas/' + submissionId + '/editar');
      await page.getByText(/A versão v3 já está enviada/).waitFor();
      const packageSelect = page.getByRole('combobox', { name: /^Modelo \/ pacote/ });
      const extras = page.getByRole('spinbutton', { name: 'Adicionais', exact: true });
      const discount = page.getByRole('spinbutton', { name: 'Desconto (%)', exact: true });
      const months = page.getByRole('spinbutton', { name: 'Prazo mínimo do contrato (meses)', exact: true });
      const activation = page.getByRole('spinbutton', { name: /^Ativação \(%\)/ });
      const finalValue = page.getByRole('spinbutton', { name: 'Valor final editável', exact: true });
      const validity = page.getByRole('spinbutton', { name: 'Validade (dias)', exact: true });
      const conditions = page.getByRole('textbox', { name: 'Descrição da condição', exact: true });
      const scope = page.getByRole('textbox', { name: /^Escopo incluído/ });
      const summary = page.locator('.portal-editor-summary');
      const calculator = page.locator('.portal-calc-result');

      await packageSelect.selectOption('FULL');
      assert.equal(await page.getByRole('spinbutton', { name: 'Valor-base interno', exact: true }).inputValue(), '7600');
      assert.equal(await months.inputValue(), '12');
      await months.fill('2');
      assert.equal(await months.inputValue(), '2');
      await extras.fill('400');
      await discount.fill('10');
      await activation.fill('25');
      await validity.fill('21');
      await conditions.fill('Condição com escopo integral QA');
      await scope.fill('Entrevistas de liderança QA\nMapa de prioridades QA');
      await readMoney(calculator.locator('div').filter({ has: page.getByText('Valor de referência', { exact: true }) }).locator('strong'), 8000);
      await calculator.getByText(/O teto comercial de .* foi aplicado/).waitFor();
      await calculator.getByText(/Contrato mínimo de 12 meses/).waitFor();
      assert.equal(await finalValue.inputValue(), '7200');
      await readMoney(summary.locator('div').filter({ has: page.getByText('Ativação · 25%', { exact: true }) }).locator('strong'), 1800);
      await finalValue.fill('7350');
      await readMoney(calculator.locator('.total strong'), 7350);
      await readMoney(summary.locator('div').filter({ has: page.getByText('Ativação · 25%', { exact: true }) }).locator('strong'), 1837.5);

      const save = summary.getByRole('button', { name: 'Salvar e visualizar', exact: true });
      assert.deepEqual(inserts, []);
      await save.click();
      await page.getByRole('alert').getByText('Portal ocupado QA. Tente novamente.', { exact: true }).waitFor();
      assert.equal(await finalValue.inputValue(), '7350');
      assert.equal(await scope.inputValue(), 'Entrevistas de liderança QA\nMapa de prioridades QA');
      assert.equal(draft, null);
      await save.click();
      await page.getByRole('button', { name: 'Editar proposta', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/admin/propostas/proposta/' + draftId);
      assert.equal(inserts.length, 2);
      assert.deepEqual(inserts[0], inserts[1]);
      assert.equal(draft.status, 'rascunho');
      assert.equal(draft.version, 4);
      assert.equal(draft.package_code, 'FULL');
      assert.equal(draft.base_price, 7600);
      assert.equal(draft.extras, 400);
      assert.equal(draft.subtotal, 8000);
      assert.equal(draft.final_unit, 7350);
      assert.equal(draft.discount_pct, 8.13);
      assert.equal(draft.contract_months, 12);
      assert.equal(draft.calculator_data.months, 12);
      assert.ok(draft.calculator_data.commercialConditions.some((condition) => condition.startsWith('Contrato mínimo de 12 meses')));
      await page.getByText(/^Contrato mínimo de 12 meses,/).waitFor();
      assert.equal(draft.validity_days, 21);
      assert.equal(draft.calculator_data.rawSubtotal, 10200);
      assert.equal(draft.calculator_data.manualFinal, true);
      assert.equal(draft.calculator_data.payment.activationPct, 25);
      assert.deepEqual(draft.scope_items, ['Entrevistas de liderança QA', 'Mapa de prioridades QA']);
      assert.deepEqual(contactUpdates.map(({ contact_email, status }) => [contact_email, status]), [
        ['decisora@example.invalid', 'edicao'], ['decisora@example.invalid', 'edicao'],
      ]);

      await page.getByRole('button', { name: 'Editar proposta', exact: true }).click();
      await page.getByRole('heading', { name: 'Construir proposta', exact: true }).waitFor();
      assert.equal(await packageSelect.inputValue(), 'FULL');
      assert.equal(await finalValue.inputValue(), '7350');
      assert.equal(await months.inputValue(), '12');
      assert.equal(await validity.inputValue(), '21');
      assert.equal(await conditions.inputValue(), 'Condição com escopo integral QA');
      assert.equal(await scope.inputValue(), 'Entrevistas de liderança QA\nMapa de prioridades QA');
      await validity.fill('30');
      await save.click();
      await page.getByRole('button', { name: 'Editar proposta', exact: true }).waitFor();
      assert.equal(edits.length, 1);
      assert.equal(edits[0].version, 4);
      assert.equal(edits[0].validity_days, 30);
      assert.equal(edits[0].contract_months, 12);
      assert.equal(edits[0].final_unit, 7350);
      assert.equal(inserts.length, 2);
      assert.deepEqual(archived, original);
      return { searchedBriefing: true, ceiling: 8000, finalUnit: 7350, minimumMonthsPersisted: 12, reopensSameDraft: true, archivedVersionPreserved: true };
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
