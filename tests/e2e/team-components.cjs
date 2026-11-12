'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId } = require('./fixtures.cjs');

browserSuite([
  {
    id: 'team-month-wizard-validation-review-and-retry',
    role: 'client',
    width: 390,
    async run({ context, page, origin, snapshot }) {
      const confirmation = 'https://cali-local-qa.supabase.co/rest/v1/rpc/confirm_team_month_v2';
      const writes = [];
      await context.route(confirmation, (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        writes.push(route.request().postDataJSON());
        return route.fulfill({
          status: writes.length === 1 ? 409 : 200,
          json: writes.length === 1 ? { message: 'Conflito simulado ao confirmar o mês.' } : { ok: true },
          headers: { 'access-control-allow-origin': origin },
        });
      });
      await page.clock.install({ time: new Date('2026-11-12T16:00:00Z') });
      await page.goto(origin + '/cliente/equipe');
      await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
      const wizard = page.getByRole('dialog', { name: 'Atualização mensal' });
      const next = wizard.getByRole('button', { name: 'Continuar' });
      await wizard.getByRole('button', { name: 'Adicionar desligamento' }).click();
      await next.click();
      await wizard.getByRole('alert').filter({ hasText: 'Complete os dados' }).waitFor();
      await wizard.getByRole('button', { name: 'Remover linha' }).click();
      await next.click();
      await wizard.getByRole('heading', { name: 'Admissões' }).waitFor();
      await wizard.getByRole('button', { name: 'Adicionar admissão' }).click();
      await wizard.getByRole('textbox', { name: 'Código interno' }).fill('QA-ADM-01');
      await wizard.getByRole('textbox', { name: 'Nome completo' }).fill('Pessoa Admissão QA');
      await wizard.getByLabel('Admissão', { exact: true }).fill('2026-11-10');
      await wizard.getByRole('textbox', { name: 'Cargo' }).fill('Analista');
      await wizard.getByRole('textbox', { name: 'Departamento' }).fill('Operações');
      await next.click();
      await wizard.getByRole('heading', { name: 'Mudanças' }).waitFor();
      await next.click();
      await wizard.getByRole('heading', { name: 'Vagas' }).waitFor();
      await next.click();
      const summary = wizard.getByText(/Entrada: Pessoa Admissão QA/);
      await summary.waitFor();
      assert.deepEqual(writes, []);
      await snapshot('revisao-mensal', wizard);
      await page.clock.runFor(500);
      const save = wizard.getByRole('button', { name: 'Confirmar mês' });
      await save.click();
      await wizard.getByRole('alert').waitFor();
      await summary.waitFor();
      await save.click();
      await wizard.waitFor({ state: 'detached' });
      assert.equal(writes.length, 2);
      assert.deepEqual(writes[0], writes[1]);
      const receipt = writes[0];
      assert.equal(receipt.p_company_id, companyId);
      assert.equal(receipt.p_reference_month, '2026-11-01');
      assert.deepEqual(receipt.p_answers, { departures: 0, admissions: 1, changes: 0, vacancies: 0 });
      assert.deepEqual(receipt.p_vacancies, []);
      assert.equal(receipt.p_people.length, 1);
      const [person] = receipt.p_people;
      assert.deepEqual(
        [person.employee_code, person.full_name, person.admission_date, person.department, person.status],
        ['QA-ADM-01', 'Pessoa Admissão QA', '2026-11-10', 'Operações', 'active'],
      );
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
