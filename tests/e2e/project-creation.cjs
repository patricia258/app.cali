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
      await create.getByLabel(/^Meta desejada/).fill('2027-02-28');
      await create.getByRole('spinbutton', { name: /^Prazo esperado de resposta/ }).fill('5');
      await create.getByRole('button', { name: 'Frente', exact: true }).click();
      await create.getByRole('button', { name: 'Frente', exact: true }).click();
      const drafts = create.locator('.front-draft-row');
      await nameCustomFront(drafts.nth(0), '  Diagnóstico QA  ');
      await drafts.nth(0).getByPlaceholder('Objetivo / contexto', { exact: true }).fill('  Ler o cenário  ');
      await nameCustomFront(drafts.nth(1), 'DIAGNÓSTICO qa');
      await drafts.nth(1).getByRole('alert').filter({ hasText: 'Essa frente já foi adicionada neste cronograma.' }).waitFor();
      assert(await save.isDisabled(), 'O rascunho não deve gravar a mesma frente duas vezes');
      await drafts.nth(1).getByPlaceholder('Nome da nova frente', { exact: true }).fill('Execução QA');
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

      const frontTrigger = selectedFronts.getByRole('button', { name: /^\+?\s*Nova frente$/ });
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
  {
    id: 'admin-rename-transfer-and-publish-draft-workstream',
    role: 'admin',
    async run({ page, context, origin }) {
      const source = { id: frontIds[0], project_id: projectId, company_id: companyId, protocol: 'CALI-FRT-QA-A', name: 'Frente inicial QA', status: 'planned', sort_order: 1 };
      const destination = { ...source, id: frontIds[1], protocol: 'CALI-FRT-QA-B', name: 'Frente de destino QA', sort_order: 2 };
      const projects = [{ ...tables.projects[0], planning_status: 'draft' }];
      const fronts = [source, destination];
      const deliverable = { ...tables.deliverables[0], workstream: source.name, workstream_id: source.id };
      const writes = [];
      const headers = { 'access-control-allow-origin': origin, 'access-control-expose-headers': 'content-range' };

      for (const [table, rows] of [['projects', projects], ['project_workstreams', fronts], ['deliverables', [deliverable]]]) {
        await context.route((url) => url.origin === api && url.pathname === '/rest/v1/' + table, (route) => {
          const request = route.request();
          const query = new URL(request.url()).searchParams;
          const scoped = rows.filter((row) => [...query].every(([field, value]) =>
            !Object.hasOwn(row, field) || !value.startsWith('eq.') || String(row[field]) === value.slice(3),
          ));
          if (request.method() === 'HEAD') return route.fulfill({ headers: { ...headers, 'content-range': scoped.length ? `0-${scoped.length - 1}/${scoped.length}` : '*/0' } });
          if (request.method() === 'PATCH' && table === 'projects') {
            const update = request.postDataJSON();
            assert.deepEqual(scoped.map(({ id }) => id), [projectId]);
            assert.deepEqual(update, { planning_status: 'client_review' });
            Object.assign(projects[0], update);
            return route.fulfill({ status: 204, headers });
          }
          if (request.method() !== 'GET') return route.fallback();
          return route.fulfill({ headers, json: request.headers().accept?.includes('vnd.pgrst.object') ? scoped[0] ?? null : scoped });
        });
      }

      await context.route((url) => url.origin === api && url.pathname === '/rest/v1/rpc/admin_update_project_workstream', (route) => {
        const data = route.request().postDataJSON();
        writes.push(data);
        if (writes.length === 1) return route.fulfill({ status: 409, headers, json: { message: 'Conflito de edição simulado.' } });
        source.name = data.p_name;
        source.objective = data.p_objective;
        deliverable.workstream = source.name;
        return route.fulfill({ headers, json: null });
      });
      await context.route((url) => url.origin === api && url.pathname === '/rest/v1/rpc/admin_delete_project_workstream', (route) => {
        const data = route.request().postDataJSON();
        writes.push(data);
        deliverable.workstream = destination.name;
        deliverable.workstream_id = data.p_move_to_workstream_id;
        fronts.splice(0, 1);
        return route.fulfill({ headers, json: null });
      });

      await page.goto(origin + '/admin/projetos?project=' + projectId);
      const publish = page.getByRole('button', { name: 'Enviar ao cliente', exact: true });
      await page.getByText('Finalize o cronograma antes de enviar', { exact: true }).waitFor();
      assert.equal(await publish.isDisabled(), true);
      await page.getByText('1 frente ainda não tem entregáveis.', { exact: true }).waitFor();
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      const front = (name) => page.locator('.front-section-v2').filter({ has: page.getByText(name, { exact: true }) });
      await front(source.name).getByRole('button', { name: 'Editar frente', exact: true }).click();
      const edit = page.getByRole('dialog', { name: 'Editar frente', exact: true });
      const save = edit.getByRole('button', { name: 'Salvar frente', exact: true });
      const name = 'Frente revisada QA';
      await edit.getByRole('textbox', { name: 'Nome da nova frente', exact: true }).fill(`  ${name}  `);
      await edit.getByRole('textbox', { name: 'Objetivo / contexto', exact: true }).fill('  Novo objetivo  ');
      await save.click();
      await edit.getByRole('alert').filter({ hasText: 'Conflito de edição simulado.' }).waitFor();
      await save.click();
      await edit.waitFor({ state: 'hidden' });
      const renamed = front(name);
      await renamed.getByRole('button', { name: 'Visualizar entregáveis da frente ' + name }).press('Enter');
      await renamed.getByText(deliverable.title, { exact: true }).waitFor();
      await renamed.getByRole('button', { name: 'Excluir frente', exact: true }).click();
      const remove = page.getByRole('dialog', { name: 'Excluir frente', exact: true });
      const transfer = remove.getByRole('button', { name: 'Transferir e excluir', exact: true });
      assert.equal(await transfer.isDisabled(), true);
      await remove.getByRole('combobox', { name: 'Transferir entregáveis para' }).selectOption(destination.id);
      await transfer.click();
      await remove.waitFor({ state: 'hidden' });
      await renamed.waitFor({ state: 'detached' });
      const receiving = front(destination.name);
      await receiving.getByRole('button', { name: 'Visualizar entregáveis da frente ' + destination.name }).click();
      await receiving.getByText(deliverable.title, { exact: true }).waitFor();
      const rename = { p_workstream_id: source.id, p_name: name, p_objective: 'Novo objetivo' };
      assert.deepEqual(writes, [rename, rename, { p_workstream_id: source.id, p_move_to_workstream_id: destination.id }]);
      assert.equal(await publish.isEnabled(), true);
      await publish.click();
      const confirm = page.getByRole('dialog', { name: 'Confirmar envio', exact: true });
      await confirm.getByRole('button', { name: 'Sim, enviar para validação', exact: true }).click();
      await confirm.waitFor({ state: 'hidden' });
      await page.getByText('Cronograma enviado para aprovação', { exact: true }).waitFor();
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
