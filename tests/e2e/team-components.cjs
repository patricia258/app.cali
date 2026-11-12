'use strict';

const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables } = require('./fixtures.cjs');

browserSuite([
  {
    id: '08-team-import-model-preview-retry-and-filtered-pdf',
    role: 'client',
    async run({ context, page, origin }) {
      const api = 'https://cali-local-qa.supabase.co/rest/v1/';
      const headers = { 'access-control-allow-origin': origin };
      const existing = tables.team_members[1];
      const newPerson = 'Pessoa Importação QA';
      const newCode = 'QA-IMP-01';
      const updatedJob = 'Analista; Controles';
      const writes = [];
      let people = structuredClone(tables.team_members);
      await context.route(api + 'team_members?**', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        assert.equal(new URL(route.request().url()).searchParams.get('company_id'), 'eq.' + companyId);
        return route.fulfill({ headers, json: people });
      });
      await context.route(api + 'rpc/save_team_month_v1', (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.fallback();
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const data = request.postDataJSON();
        writes.push(data);
        if (writes.length === 1) {
          return route.fulfill({ headers, status: 409, json: { message: 'Conflito simulado na importação.' } });
        }
        for (const row of data.p_rows) {
          const current = people.find((person) => person.employee_code === row.employee_code);
          if (current) Object.assign(current, row);
          else people.push({ ...row, id: 'qa-imported-person', company_id: companyId, avatar_style: 'neutral' });
        }
        return route.fulfill({ headers, json: { ok: true } });
      });
      await page.clock.install({ time: new Date('2026-11-12T16:00:00Z') });
      await page.goto(origin + '/cliente/equipe');
      await page.getByRole('button', { name: 'Abrir ficha de ' + existing.full_name, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Cadastrar todos via planilha' }).click();
      const dialog = page.getByRole('dialog', { name: 'Cadastrar colaboradores por planilha' });
      const upload = dialog.locator('input[type=file]');
      const confirm = dialog.getByRole('button', { name: /^Cadastrar \/ atualizar/ });
      assert(await confirm.isDisabled());
      const [model] = await Promise.all([
        page.waitForEvent('download'),
        dialog.getByRole('button', { name: 'Baixar modelo CSV' }).click(),
      ]);
      assert.equal(model.suggestedFilename(), 'cali-modelo-colaboradores.csv');
      const csv = await readFile(await model.path(), 'utf8');
      assert.equal(csv[0], '\uFEFF');
      const headersFromModel = csv.trim().split(';');
      const required = ['codigo_colaborador', 'nome_completo', 'data_admissao', 'cargo', 'departamento'];
      for (const field of [...required, 'codigo_gestor', 'codigo_esocial_desligamento']) {
        assert(headersFromModel.includes(field));
      }
      const sendCsv = (name, header, rows) =>
        upload.setInputFiles({
          name,
          mimeType: 'text/csv',
          buffer: Buffer.from([header.join(';'), ...rows].join('\r\n')),
        });
      const invalid = `${newCode};Pessoa QA;10/11/2026;Analista;Operações`;
      await sendCsv('duplicado.csv', required, [invalid, invalid]);
      await dialog.getByRole('alert').filter({ hasText: 'Código ausente ou repetido na linha 3.' }).waitFor();
      assert(await confirm.isDisabled());
      assert.deepEqual(writes, []);

      await sendCsv('codigo-invalido.csv', [...required, 'codigo_esocial_desligamento'], [invalid + ';99']);
      await dialog.getByRole('alert').filter({ hasText: 'Código eSocial inválido na linha 2.' }).waitFor();
      assert(await confirm.isDisabled());

      const csvRow = (data) => headersFromModel.map((field) => data[field] ?? '').join(';');
      const created = csvRow({
        codigo_colaborador: newCode,
        nome_completo: newPerson,
        data_admissao: '10/11/2026',
        cargo: 'Analista de apoio',
        departamento: 'Operações',
        codigo_gestor: 'QA01',
      });
      const edited = csvRow({
        codigo_colaborador: existing.employee_code,
        nome_completo: existing.full_name,
        data_admissao: existing.admission_date,
        cargo: '"' + updatedJob + '"',
        departamento: existing.department,
        codigo_gestor: existing.manager_code,
      });
      const terminated = csvRow({
        codigo_colaborador: 'QA-IMP-02',
        nome_completo: 'Pessoa Desligada QA',
        data_admissao: '03/11/2026',
        cargo: 'Assistente',
        departamento: 'Pessoas',
        situacao: 'Desligada',
        data_desligamento: '11/11/2026',
        codigo_esocial_desligamento: '7',
        motivo_desligamento: 'Pedido registrado',
      });
      await sendCsv('equipe.csv', headersFromModel, [created, edited, terminated]);
      const preview = dialog.getByText('3 pessoas · 2 novas · 1 alteradas · 0 sem mudança · 4 ausentes', {
        exact: true,
      });
      const parseError = dialog.getByRole('alert').filter({ hasText: 'Código eSocial inválido' });
      await preview.or(parseError).waitFor();
      assert.deepEqual(await parseError.allTextContents(), []);
      await dialog.getByText(newPerson + ' · Operações', { exact: true }).waitFor();
      assert.deepEqual(writes, []);
      await confirm.click();
      await dialog.getByRole('alert').waitFor();
      await preview.waitFor();
      await confirm.click();
      await dialog.waitFor({ state: 'detached' });
      await page.getByRole('status').filter({ hasText: 'Equipe de novembro de 2026 confirmada.' }).waitFor();
      await page.getByRole('button', { name: 'Abrir ficha de ' + newPerson, exact: true }).waitFor();
      assert.equal(writes.length, 2);
      assert.deepEqual(writes[0], writes[1]);
      const receipt = writes[0];
      assert.equal(receipt.p_company_id, companyId);
      assert.equal(receipt.p_reference_month, '2026-11-01');
      assert.deepEqual(
        receipt.p_rows.map((row) => [row.employee_code, row.job_title, row.admission_date, row.manager_code]),
        [
          [newCode, 'Analista de apoio', '2026-11-10', 'QA01'],
          [existing.employee_code, updatedJob, existing.admission_date, existing.manager_code],
          ['QA-IMP-02', 'Assistente', '2026-11-03', null],
        ],
      );
      assert.deepEqual(
        receipt.p_rows.map((row) => [row.status, row.termination_initiative, row.termination_reason]),
        [
          ['active', null, null],
          ['active', null, null],
          ['terminated', 'employee', '[eSocial:07] Pedido registrado'],
        ],
      );
      await page.getByRole('button', { name: 'Abrir ficha de Pessoa Quatro QA', exact: true }).waitFor();
      assert.equal(people.length, tables.team_members.length + 2);

      await page.getByRole('combobox', { name: 'Departamento', exact: true }).selectOption('Operações');
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => {
        window.print = () => {
          window.teamQaPrintRequested = true;
        };
      });
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50));
      await page.getByRole('button', { name: 'Exportar', exact: true }).click();
      assert(
        await page.evaluate(
          () => window.teamQaPrintRequested && document.body.classList.contains('team-printing'),
        ),
      );
      const printHeader = page.locator('.team-print-heading');
      await printHeader.waitFor();
      assert.match(await printHeader.innerText(), /4 pessoas no filtro/);
      const rows = await page.getByRole('table').getByRole('row').allTextContents();
      assert(rows.some((row) => row.includes(newPerson)));
      assert(rows.every((row) => !row.includes('Pessoa Quatro QA')));
      const pdf = await page.pdf({ format: 'A4' });
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
      return { modelAccepted: true, retryKeepsPreview: true, absentMembersPreserved: true, filteredPdf: true };
    },
  },
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
