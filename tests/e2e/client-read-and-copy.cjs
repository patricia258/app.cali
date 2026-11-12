'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';
const delivery = tables.deliverables[2];
const standalone = {
  ...tables.files[0],
  id: '55555554-5555-4555-8555-555555555555',
  title: 'Política publicada QA',
  storage_path: companyId + '/documentos/politica-qa.pdf',
  deliverable_id: null,
  task_id: null,
};
const fileUrl = 'https://drive.example.invalid/file/test-fixture';
const folderUrl = 'https://drive.example.invalid/folder/test-fixture';

async function intercept(context, origin, path, method, handler) {
  return context.route(
    (url) => url.origin === host && url.pathname === path,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const { json, status = 200 } = handler(request);
      return route.fulfill({ status, json, headers: { 'access-control-allow-origin': origin } });
    },
  );
}

async function stubDrive(context, page, origin, handle) {
  await context.addInitScript(() => {
    window.open = (url) => {
      (window.__qaDriveOpened ??= []).push(String(url));
      return null;
    };
  });
  await intercept(context, origin, '/functions/v1/google-drive-oauth', 'POST', (request) =>
    handle(request.postDataJSON()),
  );
  await page.goto(origin + '/cliente/documentos');
  await page.getByText('Drive da sua empresa conectado', { exact: true }).waitFor();
}

const connected = (jobs = []) => ({
  connected: true,
  connection: { id: 'connection-qa', accountEmail: 'drive@example.invalid', status: 'connected' },
  jobs,
});

browserSuite([
  {
    id: '11-drive-copy-file-and-open-persisted-receipt',
    role: 'client',
    async run({ page, context, origin }) {
      const copies = [];
      await intercept(context, origin, '/rest/v1/files', 'GET', (request) => {
        const params = new URL(request.url()).searchParams;
        assert.equal(params.get('client_visible'), 'eq.true');
        assert.equal(params.get('status'), 'eq.published');
        return { json: [standalone] };
      });
      await stubDrive(context, page, origin, (body) => {
        if (body.action === 'status')
          return {
            json: connected(
              copies.length === 2 ? [{ file_id: standalone.id, status: 'synced', external_url: fileUrl }] : [],
            ),
          };
        copies.push(body);
        if (copies.length === 1) return { status: 409, json: { error: 'copy_conflict_qa' } };
        return { json: { status: 'synced', url: fileUrl } };
      });
      const document = page
        .locator('article')
        .filter({ has: page.getByRole('heading', { name: standalone.title, exact: true }) });
      await document.getByRole('button', { name: 'Salvar no meu Drive', exact: true }).click();
      await page.getByRole('alert').waitFor();
      await document.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
      await page
        .getByRole('status')
        .filter({ hasText: standalone.title + ' foi salvo no seu Google Drive.' })
        .waitFor();
      await page.reload();
      await document.getByRole('button', { name: 'Abrir no Drive', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.__qaDriveOpened), [fileUrl]);
      assert.deepEqual(copies, Array(2).fill({ action: 'copy_file', fileId: standalone.id }));
      return { exactVersion: standalone.id, opensPersistedReceipt: true };
    },
  },
  {
    id: '11-drive-folder-mixed-content-and-partial-retry',
    role: 'client',
    async run({ page, context, origin }) {
      const copies = [];
      await stubDrive(context, page, origin, (body) => {
        if (body.action === 'status') return { json: connected() };
        copies.push(body);
        return {
          json: {
            status: copies.length === 1 ? 'partial' : 'synced',
            copied: 1,
            failed: copies.length === 1 ? 1 : 0,
            url: folderUrl,
          },
        };
      });
      await page.getByRole('button', { name: 'Abrir a pasta ' + delivery.title, exact: true }).click();
      const folder = page.getByRole('region', { name: 'Pasta ' + delivery.title });
      await folder.getByText('Preparação QA', { exact: true }).waitFor();
      const copy = folder.getByRole('button', { name: 'Salvar pasta no Drive', exact: true });
      await copy.click();
      await page.getByRole('status').filter({ hasText: '1 não pôde(puderam) ser copiado(s)' }).waitFor();
      await copy.click();
      await page
        .getByRole('status')
        .filter({ hasText: 'foi salva no seu Google Drive, na pasta CALI Workspace' })
        .waitFor();
      assert.deepEqual(copies, Array(2).fill({ action: 'copy_folder', deliverableId: delivery.id }));
      assert.deepEqual(await page.evaluate(() => window.__qaDriveOpened), [folderUrl, folderUrl]);
      return { partialReceipt: true, sameFolderOnRetry: true };
    },
  },
  {
    id: '18-front-eligibility-and-scope-in-contact-link',
    role: 'client',
    async run({ page, context, origin }) {
      const scopedReads = [];
      const contracted = tables.front_catalog.find((front) => front.title === 'Possibilidade QA dois');
      await intercept(context, origin, '/rest/v1/company_fronts', 'GET', (request) => {
        scopedReads.push(new URL(request.url()).searchParams.get('company_id'));
        return {
          json: [
            {
              id: 'front-qa',
              company_id: companyId,
              front_code: contracted.code,
              status: 'active',
              ends_at: null,
              mode: 'slot_paid',
            },
          ],
        };
      });
      await page.goto(origin + '/cliente/frentes');
      await page.getByRole('heading', { name: 'Frente QA incluída um', exact: true }).waitFor();
      assert.equal(await page.getByText(contracted.title, { exact: true }).count(), 0);
      const possibility = page.locator('details').filter({ hasText: 'Possibilidade QA um' });
      await possibility.locator('summary').press('Enter');
      await possibility.getByText('O que pode envolver', { exact: true }).waitFor();
      const trigger = possibility.getByRole('button', { name: 'Conversar sobre esta frente' });
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Possibilidade QA um', exact: true });
      const contact = dialog.getByRole('link', { name: 'Conversar com a CALI' });
      const destination = new URL(await contact.getAttribute('href'));
      assert.equal(destination.origin, 'https://wa.me');
      assert.equal(
        destination.searchParams.get('text'),
        'Olá! Gostaria de conversar sobre Possibilidade QA um para Empresa QA fictícia.',
      );
      assert.equal(await contact.getAttribute('target'), '_blank');
      assert(scopedReads.length > 0 && scopedReads.every((filter) => filter === 'eq.' + companyId));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate((element) => element === document.activeElement));
      return { companyScoped: true, externalContactInspectedOnly: true };
    },
  },
  {
    id: '18-faq-accent-insensitive-answer-search-and-reset',
    role: 'client',
    async run({ page, origin }) {
      await page.goto(origin + '/cliente/ajuda');
      const search = page.getByRole('textbox', { name: 'Buscar nas dúvidas frequentes' });
      const question = page.getByRole('button', {
        name: 'O que acontece se não utilizarmos todas as horas do mês?',
      });
      await search.fill('  NAO SAO ACUMULADAS  ');
      assert.equal(await question.getAttribute('aria-expanded'), 'true');
      await page.getByText(/As horas não utilizadas não são acumuladas/).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Avisos de consumo' }).count(), 0);
      await search.fill('TERMO-AUSENTE-QA');
      await page.getByText(/Nenhuma pergunta encontrada.*Fale com a CALI pelas Ocorrências/).waitFor();
      await search.clear();
      await page.getByRole('heading', { name: 'Avisos de consumo' }).waitFor();
      assert.equal(await question.getAttribute('aria-expanded'), 'false');
      await question.press('Enter');
      assert.equal(await question.getAttribute('aria-expanded'), 'true');
      await question.press('Enter');
      assert.equal(await question.getAttribute('aria-expanded'), 'false');
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
