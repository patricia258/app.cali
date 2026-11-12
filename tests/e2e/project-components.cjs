'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, projectId, tables } = require('./fixtures.cjs');

const delivery = tables.deliverables.find((row) => row.title === 'Entrega QA C');
const host = 'https://cali-local-qa.supabase.co';
const where = (url, table) => url.origin === host && url.pathname === '/rest/v1/' + table;
const query = '?deliverable=' + delivery.id + '&project=' + projectId;

function reply(route, origin, rows) {
  const headers = { 'access-control-allow-origin': origin };
  return rows === undefined ? route.fulfill({ status: 204, headers }) : route.fulfill({ json: rows, headers });
}

async function openDelivery(page, origin, route = '/admin/projetos') {
  await page.goto(origin + route + query);
  const dialog = page.getByRole('dialog', { name: delivery.title, exact: true });
  await dialog.waitFor();
  return dialog;
}

browserSuite([
  {
    id: 'project-internal-note-lifecycle-and-client-scope',
    role: 'admin',
    async run({ context, page, origin, snapshot, openActor }) {
      const noteId = 'e5110000-0000-4000-8000-000000000001';
      let note;
      const operations = [];
      await context.route((url) => where(url, 'note_entries'), (route) => {
        const request = route.request();
        const params = new URL(request.url()).searchParams;
        if (request.method() === 'GET') {
          assert.equal(params.get('deliverable_id'), 'eq.' + delivery.id);
          assert.equal(params.get('task_id'), 'is.null');
          return reply(route, origin, note ? [note] : []);
        }
        if (request.method() === 'POST') {
          const data = request.postDataJSON();
          assert.equal(data.deliverable_id, delivery.id);
          assert.equal(data.company_id, companyId);
          assert.equal(data.task_id, null);
          operations.push(['add', data.body]);
          note = { ...data, id: noteId, created_at: '2026-11-12T16:00:00Z' };
          return reply(route, origin);
        }
        if (request.method() === 'PATCH') {
          assert.equal(params.get('id'), 'eq.' + noteId);
          const { body } = request.postDataJSON();
          operations.push(['edit', body]);
          note.body = body;
          return reply(route, origin);
        }
        if (request.method() === 'DELETE') {
          assert.equal(params.get('id'), 'eq.' + noteId);
          operations.push(['delete', note.body]);
          note = undefined;
          return reply(route, origin);
        }
        return route.fallback();
      });

      const dialog = await openDelivery(page, origin);
      await dialog.getByRole('button', { name: 'Visão geral', exact: true }).click();
      const notes = dialog.locator('.v2-notelog').filter({ has: page.getByRole('heading', { name: 'Notas internas' }) });
      await notes.getByText('Nenhuma nota gravada ainda.').waitFor();
      const create = notes.getByRole('textbox', { name: 'Nova nota interna' });
      const add = notes.getByRole('button', { name: 'Adicionar nota' });
      assert.equal(await add.isDisabled(), true);
      await create.fill('  Nota sintética interna.  ');
      await add.click();
      await notes.getByText('Nota sintética interna.', { exact: true }).waitFor();
      await notes.getByRole('button', { name: 'Editar nota' }).press('Enter');
      const edit = notes.getByRole('textbox', { name: 'Editar nota interna' });
      assert.equal(await edit.evaluate((element) => element === document.activeElement), true);
      await edit.fill('Nota revisada de QA.');
      await notes.getByRole('button', { name: 'Salvar' }).click();
      await notes.getByText('Nota revisada de QA.', { exact: true }).waitFor();
      await snapshot('admin-nota-interna', notes);

      const client = await openActor('client');
      const privateReads = [];
      await client.context.route((url) => where(url, 'note_entries'), (route) => {
        privateReads.push(route.request().method());
        return route.fallback();
      });
      const clientDialog = await openDelivery(client.page, origin, '/cliente/entregaveis');
      await clientDialog.getByRole('button', { name: 'Visão geral', exact: true }).click();
      await clientDialog.getByRole('heading', { name: 'Sobre esta entrega' }).waitFor();
      assert.deepEqual(privateReads, []);
      assert.equal(await clientDialog.getByText('Nota revisada de QA.').count(), 0);

      await notes.getByRole('button', { name: 'Excluir nota' }).click();
      await notes.getByRole('button', { name: 'Manter' }).click();
      assert.deepEqual(operations, [['add', 'Nota sintética interna.'], ['edit', 'Nota revisada de QA.']]);
      await notes.getByRole('button', { name: 'Excluir nota' }).click();
      await notes.getByRole('button', { name: 'Excluir', exact: true }).click();
      await notes.getByText('Nenhuma nota gravada ainda.').waitFor();
      assert.deepEqual(operations.at(-1), ['delete', 'Nota revisada de QA.']);
    },
  },
  {
    id: 'project-deliverable-file-release-rename-and-suspend',
    role: 'admin',
    async run({ context, page, origin, snapshot }) {
      const id = 'e5220000-0000-4000-8000-000000000001';
      const path = companyId + '/entregaveis/qa.pdf';
      const token = '[[arquivo|' + encodeURIComponent('Rascunho QA.pdf') + '|' + encodeURIComponent(path) + '|application%2Fpdf|2048]]';
      const file = { id, storage_path: path, status: 'draft', title: 'Título inicial QA' };
      const writes = [];
      let releaseRename;
      const renameGate = new Promise((resolve) => { releaseRename = resolve; });
      await context.route((url) => where(url, 'comments') && url.searchParams.get('select') === 'body,created_at', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return reply(route, origin, [{ body: token, created_at: '2026-11-12T16:00:00Z' }]);
      });
      await context.route((url) => where(url, 'files'), async (route) => {
        const request = route.request();
        const params = new URL(request.url()).searchParams;
        if (request.method() === 'GET' && params.get('select') === 'id,storage_path,status,title') {
          assert.equal(params.get('deliverable_id'), 'eq.' + delivery.id);
          return reply(route, origin, [file]);
        }
        if (request.method() === 'PATCH') {
          assert.equal(params.get('id'), 'eq.' + id);
          const data = request.postDataJSON();
          writes.push(data);
          if ('title' in data) await renameGate;
          Object.assign(file, data);
          return reply(route, origin);
        }
        return route.fallback();
      });
      const dialog = await openDelivery(page, origin);
      await dialog.getByRole('button', { name: 'Arquivos', exact: true }).click();
      const files = dialog.locator('.v2-dfiles');
      await files.getByText('Aguardando liberação da Patricia').waitFor();
      await files.getByRole('button', { name: 'Liberar para o cliente', exact: true }).click();
      await files.getByText('Liberado ao cliente').waitFor();
      assert.equal(writes[0].status, 'published');
      assert.equal(writes[0].client_visible, true);
      await files.getByRole('button', { name: 'Renomear', exact: true }).click();
      const name = files.getByRole('textbox', { name: 'Nome do documento para o cliente' });
      await name.fill('Rascunho cancelado');
      await name.press('Escape');
      await name.waitFor({ state: 'detached' });
      await dialog.waitFor();
      assert.equal(await files.getByRole('button', { name: 'Renomear', exact: true }).evaluate((element) => element === document.activeElement), true);
      assert.equal(writes.length, 1);
      await files.getByRole('button', { name: 'Renomear', exact: true }).click();
      await name.fill('  PDF de QA aprovado  ');
      await name.press('Enter');
      await files.getByRole('button', { name: 'Salvando nome' }).waitFor();
      assert.equal(await name.isDisabled(), true);
      await name.dispatchEvent('keydown', { key: 'Enter', bubbles: true });
      releaseRename();
      await files.getByText('O cliente vê como: PDF de QA aprovado').waitFor();
      await snapshot('arquivo-liberado', files);
      await files.getByRole('button', { name: 'Suspender', exact: true }).click();
      await files.getByText('Suspenso', { exact: true }).waitFor();
      assert.deepEqual(writes.slice(1), [{ title: 'PDF de QA aprovado' }, { status: 'archived', client_visible: false }]);
    },
  },
  {
    id: 'client-subtask-keyboard-and-message-retry',
    role: 'client',
    async run({ context, page, origin, snapshot }) {
      const task = tables.deliverable_tasks.find((row) => row.title === 'Validação do cliente QA');
      const messages = [];
      const writes = [];
      await context.route((url) => where(url, 'task_messages'), (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const params = new URL(route.request().url()).searchParams;
        assert.equal(params.get('task_id'), 'eq.' + task.id);
        assert.equal(params.get('client_visible'), 'eq.true');
        return reply(route, origin, messages);
      });
      await context.route((url) => where(url, 'rpc/client_post_task_message'), (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        const data = route.request().postDataJSON();
        writes.push(data);
        const headers = { 'access-control-allow-origin': origin };
        if (writes.length === 1) return route.fulfill({ status: 503, json: { message: 'Mensagem temporariamente indisponível.' }, headers });
        messages.push({ id: 'qa-task-message', author_role: 'client', body: data.p_body, created_at: '2026-11-12T16:00:00Z' });
        return route.fulfill({ json: null, headers });
      });
      await page.goto(origin + '/cliente/entregaveis?project=' + projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      const row = page.getByRole('button', { name: /Validação do cliente QA/ });
      await row.press('Space');
      const subtask = page.getByRole('dialog', { name: 'Subtarefa Validação do cliente QA' });
      await subtask.waitFor();
      const field = subtask.getByRole('textbox', { name: 'Mensagem para a CALI' });
      await field.fill('Mensagem sintética de QA.');
      await field.dispatchEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true });
      await field.press('Shift+Enter');
      assert.deepEqual(writes, []);
      await field.press('Enter');
      await subtask.getByRole('alert').filter({ hasText: 'Mensagem temporariamente indisponível.' }).waitFor();
      assert.equal((await field.inputValue()).trim(), 'Mensagem sintética de QA.');
      await subtask.getByRole('button', { name: 'Enviar', exact: true }).waitFor();
      await field.press('Enter');
      await subtask.locator('.v2-subtask-thread').getByText('Mensagem sintética de QA.', { exact: true }).waitFor();
      assert.equal(await field.inputValue(), '');
      assert.equal(await subtask.getByRole('alert').count(), 0);
      assert.deepEqual(writes, Array(2).fill({ p_task_id: task.id, p_body: 'Mensagem sintética de QA.' }));
      await snapshot('conversa-da-subtarefa', subtask);
      await page.keyboard.press('Escape');
      await subtask.waitFor({ state: 'detached' });
      assert.equal(await row.evaluate((element) => element === document.activeElement), true);
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
