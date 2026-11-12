'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, projectId, tables } = require('./fixtures.cjs');

const api = 'https://cali-local-qa.supabase.co';
const newCompanyId = 'e7410000-0000-4000-8000-000000000001';
const newProjectId = 'e7410000-0000-4000-8000-000000000002';
const newCompany = 'Empresa sem projeto QA';
const newProject = 'Ciclo de implantação QA';
const frontIds = [
  'e7410000-0000-4000-8000-000000000003',
  'e7410000-0000-4000-8000-000000000004',
  'e7410000-0000-4000-8000-000000000005',
];

async function mockPlanning(context, origin, { empty = false, noCompanies = false } = {}) {
  const projects = empty ? [] : structuredClone(tables.projects);
  const fronts = empty ? [] : structuredClone(tables.project_workstreams);
  const company = { ...tables.companies[0], id: newCompanyId, display_name: newCompany };
  const companies = noCompanies ? [] : empty ? [company] : [...tables.companies, company];
  const writes = [];

  for (const [table, rows] of [['companies', companies], ['projects', projects], ['project_workstreams', fronts]]) {
    await context.route((url) => url.origin === api && url.pathname === '/rest/v1/' + table, (route) => {
      const request = route.request();
      const query = new URL(request.url()).searchParams;
      const headers = { 'access-control-allow-origin': origin, 'access-control-expose-headers': 'content-range' };
      const scoped = rows.filter((row) => [...query].every(([field, value]) =>
        !Object.hasOwn(row, field) || !value.startsWith('eq.') || String(row[field]) === value.slice(3),
      ));

      if (request.method() === 'HEAD') {
        return route.fulfill({ status: 200, headers: { ...headers, 'content-range': scoped.length ? `0-${scoped.length - 1}/${scoped.length}` : '*/0' } });
      }
      if (request.method() === 'GET') {
        return route.fulfill({
          headers,
          json: request.headers().accept?.includes('vnd.pgrst.object') ? scoped[0] ?? null : scoped,
        });
      }
      if (request.method() !== 'POST' || table === 'companies') return route.fallback();
      const data = request.postDataJSON();
      writes.push({ table, data });
      if (table === 'projects') {
        projects.unshift({ ...data, id: newProjectId, protocol: 'CALI-PRJ-QA-NOVO' });
        return route.fulfill({ status: 201, headers, json: { id: newProjectId } });
      }
      for (const entry of Array.isArray(data) ? data : [data]) {
        const index = fronts.filter((front) => front.project_id === newProjectId).length;
        fronts.push({ ...entry, id: frontIds[index], status: 'planned', protocol: `CALI-FRT-QA-${index + 1}` });
      }
      return route.fulfill({ status: 201, headers });
    });
  }
  return writes;
}

async function nameCustomFront(form, name) {
  await form.getByRole('combobox', { name: 'Frente CALI', exact: true }).selectOption('Outro');
  await form.getByPlaceholder('Nome da nova frente', { exact: true }).fill(name);
}

browserSuite([
  {
    id: 'admin-create-first-project',
    role: 'admin',
    async run({ page, context, origin, snapshot }) {
      const writes = await mockPlanning(context, origin, { empty: true });
      await page.goto(origin + '/admin/projetos');
      await page.getByRole('heading', { name: 'Nenhum projeto cadastrado', exact: true }).waitFor();
      await page.getByText('Crie o primeiro projeto para organizar frentes, entregáveis e prazos.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('combobox', { name: 'Projeto', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Nova frente', exact: true }).count(), 0);
      const start = page.getByRole('button', { name: 'Novo projeto', exact: true });
      await start.waitFor();
      await snapshot('carteira-vazia');
      await start.click();
      const create = page.getByRole('dialog', { name: 'Novo projeto', exact: true });
      assert.equal(await create.getByRole('combobox', { name: 'Cliente', exact: true }).inputValue(), newCompanyId);
      await create.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill(newProject);
      await nameCustomFront(create, 'Primeira frente QA');
      await create.getByRole('button', { name: 'Criar cronograma', exact: true }).click();
      await page.getByRole('heading', { name: newProject, exact: true }).waitFor();

      assert.equal(writes.length, 2);
      assert.equal(writes[0].table, 'projects');
      assert.equal(writes[0].data.company_id, newCompanyId);
      assert.equal(writes[0].data.name, newProject);
      assert.deepEqual(writes[1], { table: 'project_workstreams', data: [{
        company_id: newCompanyId, project_id: newProjectId, name: 'Primeira frente QA', objective: null,
        roadmap_month_start: 1, roadmap_month_end: 1, sort_order: 1,
      }] });

      await page.goto(origin + '/admin/projetos?project=' + newProjectId);
      await page.getByRole('heading', { name: newProject, exact: true }).waitFor();
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      const roadmap = page.locator('.roadmap-v2');
      await roadmap.getByRole('heading', { name: '0 entregáveis em 1 frente', exact: true }).waitFor();
      await roadmap.getByText('Primeira frente QA', { exact: true }).waitFor();
      await snapshot('primeiro-projeto', roadmap);
      return { initialProjects: 0, firstProject: true, reread: true };
    },
  },
  {
    id: 'admin-empty-projects-without-company',
    role: 'admin',
    async run({ page, context, origin }) {
      const writes = await mockPlanning(context, origin, { empty: true, noCompanies: true });
      await page.goto(origin + '/admin/projetos');
      await page.getByRole('heading', { name: 'Nenhum projeto cadastrado', exact: true }).waitFor();
      await page.getByText('Cadastre uma empresa em Clientes para criar o primeiro projeto.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Novo projeto', exact: true }).count(), 0);
      assert.equal(writes.length, 0);
    },
  },
  {
    id: 'admin-create-project-and-workstreams',
    role: 'admin',
    async run({ page, context, origin, snapshot }) {
      const writes = await mockPlanning(context, origin);
      await page.goto(origin + '/admin/projetos?project=' + projectId);
      const accountPicker = page.getByRole('combobox', { name: 'Empresa', exact: true });
      const projectPicker = page.getByRole('combobox', { name: 'Projeto', exact: true });
      await page.getByRole('heading', { name: tables.projects[0].name, exact: true }).waitFor();
      assert.equal(await accountPicker.inputValue(), companyId);
      assert.equal(await accountPicker.getByRole('option', { name: newCompany, exact: true }).count(), 0);

      await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
      const create = page.getByRole('dialog', { name: 'Novo projeto', exact: true });
      const save = create.getByRole('button', { name: 'Criar cronograma', exact: true });
      assert.equal(await save.isDisabled(), true);
      const accounts = create.getByRole('combobox', { name: /^Cliente/ });
      const availableAccounts = await accounts.locator('option').evaluateAll((options) => options.map((option) => option.value));
      assert(availableAccounts.includes(newCompanyId), 'O cadastro deve oferecer conta ativa sem projeto anterior');
      await accounts.selectOption(newCompanyId);
      await create.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill(`  ${newProject}  `);
      await create.getByLabel('Início', { exact: true }).fill('2026-12-01');
      await create.getByLabel(/^Previsão final/).fill('2027-02-28');
      await create.getByRole('spinbutton', { name: /^Prazo esperado de resposta/ }).fill('5');
      await create.getByRole('button', { name: 'Frente', exact: true }).click();
      await create.getByRole('button', { name: 'Frente', exact: true }).click();
      const drafts = create.locator('.front-draft-row');
      await nameCustomFront(drafts.nth(0), '  Diagnóstico QA  ');
      await drafts.nth(0).getByPlaceholder('Objetivo / contexto', { exact: true }).fill('  Ler o cenário  ');
      await nameCustomFront(drafts.nth(1), 'Execução QA');
      await save.click();
      await create.waitFor({ state: 'hidden' });
      await page.getByRole('heading', { name: newProject, exact: true }).waitFor();
      assert.equal(await accountPicker.inputValue(), newCompanyId);
      assert.equal(await projectPicker.inputValue(), newProjectId);

      const selectedFronts = page.locator('.roadmap-v2');
      const deliveries = page.getByRole('tab', { name: 'Entregáveis', exact: true });
      await deliveries.click();
      await selectedFronts.getByRole('heading', { name: '0 entregáveis em 2 frentes', exact: true }).waitFor();
      await selectedFronts.getByText('Diagnóstico QA', { exact: true }).waitFor();
      await selectedFronts.getByText('Execução QA', { exact: true }).waitFor();

      const frontTrigger = page.getByRole('button', { name: 'Nova frente', exact: true });
      await frontTrigger.click();
      const frontDialog = page.getByRole('dialog', { name: 'Nova frente', exact: true });
      const add = frontDialog.getByRole('button', { name: 'Adicionar frente', exact: true });
      assert.equal(await add.isDisabled(), true);
      await frontDialog.getByText(newProject, { exact: true }).waitFor();
      await nameCustomFront(frontDialog, 'Frente cancelada QA');
      await frontDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      assert.equal(writes.length, 2);

      await frontTrigger.click();
      await nameCustomFront(frontDialog, '  Encerramento QA  ');
      await frontDialog.getByRole('textbox', { name: 'Objetivo / contexto', exact: true }).fill('  Registrar os resultados  ');
      await add.click();
      await frontDialog.waitFor({ state: 'hidden' });

      const base = { project_id: newProjectId, company_id: newCompanyId };
      assert.deepEqual(writes, [
        { table: 'projects', data: {
          company_id: newCompanyId, name: newProject, status: 'planned', planning_status: 'draft',
          start_date: '2026-12-01', target_end_date: '2027-02-28',
          roadmap_start_date: '2026-12-01', roadmap_end_date: '2027-02-28',
          client_response_business_days: 5, adjustment_limit: 3,
        } },
        { table: 'project_workstreams', data: [
          { ...base, name: 'Diagnóstico QA', objective: 'Ler o cenário', roadmap_month_start: 1, roadmap_month_end: 1, sort_order: 1 },
          { ...base, name: 'Execução QA', objective: null, roadmap_month_start: 1, roadmap_month_end: 1, sort_order: 2 },
        ] },
        { table: 'project_workstreams', data: {
          ...base, name: 'Encerramento QA', objective: 'Registrar os resultados', roadmap_month_start: 1, roadmap_month_end: 1, sort_order: 3,
        } },
      ]);

      await page.goto(origin + '/admin/projetos?project=' + newProjectId);
      await page.getByRole('heading', { name: newProject, exact: true }).waitFor();
      await deliveries.click();
      await selectedFronts.getByRole('heading', { name: '0 entregáveis em 3 frentes', exact: true }).waitFor();
      for (const label of ['Diagnóstico QA', 'Execução QA', 'Encerramento QA']) {
        await selectedFronts.getByText(label, { exact: true }).waitFor();
      }
      assert.equal(await selectedFronts.getByText('Governança', { exact: true }).count(), 0);
      await snapshot('projeto-com-frentes', selectedFronts);
      return { companyWithoutPreviousProjects: true, initialFronts: 2, additionalFronts: 1, reread: true };
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
