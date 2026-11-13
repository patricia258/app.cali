'use strict';

const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';

function endpoint(context, pathname, method, handler) {
  return context.route(
    (url) => url.origin === host && url.pathname === pathname,
    (route) => (route.request().method() === method ? handler(route) : route.fallback()),
  );
}

const cases = [
  {
    id: '11-admin-document-releases-cancelled-cover-preview',
    role: 'admin',
    async run({ page, origin }) {
      await page.goto(origin + '/admin/documentos');
      await page.getByRole('button', { name: 'Adicionar documento', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Editar documento' });
      await editor.locator('input[accept="image/png,image/jpeg,image/webp"]').setInputFiles({
        name: 'capa.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH+kAAAAASUVORK5CYII=', 'base64'),
      });
      const preview = editor.getByRole('img', { name: 'Prévia da capa' });
      await preview.waitFor();
      const url = await preview.getAttribute('src');
      assert.equal(await page.evaluate(async (url) => (await fetch(url)).ok, url), true);
      await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
      await page.waitForFunction((url) => fetch(url).then(() => false, () => true), url);
    },
  },
  {
    id: '11-admin-document-revision-private-upload-and-publication',
    role: 'admin',
    async run({ page, context, openActor, origin }) {
      const headers = { 'access-control-allow-origin': origin };
      const timestamp = '2026-11-12T16:00:00.000Z';
      const storagePrefix = '/storage/v1/object/cali-workspace-private';
      const original = {
        id: '11111114-1111-4111-8111-111111111111',
        company_id: companyId,
        title: 'Manual de procedimento QA',
        category: 'manual',
        document_kind: 'Manual',
        version_label: 'v1.0',
        protocol: 'CALI-DOC-20261112-001',
        storage_path: 'documents/' + companyId + '/original.pdf',
        status: 'published',
        workflow_stage: 'published',
        requires_acknowledgement: true,
        client_visible: true,
        source_type: 'workspace',
        original_filename: 'original.pdf',
        updated_at: timestamp,
        published_at: timestamp,
        file_type: 'application/pdf',
        description: 'Primeira edição QA.',
      };
      const revisedTitle = original.title + ' revisado';
      const revisionId = '11111115-1111-4111-8111-111111111111';
      const newUploads = [];
      const deletes = [];
      const inserts = [];
      const publications = [];
      const audit = [];
      const stored = new Set([original.storage_path]);
      let revision;
      let generated = 0;
      const client = await openActor('client');
      await endpoint(client.context, '/rest/v1/files', 'GET', (route) => {
        const filter = new URL(route.request().url()).searchParams;
        assert.equal(filter.get('client_visible'), 'eq.true');
        assert.equal(filter.get('status'), 'eq.published');
        return route.fulfill({ headers, json: [original, ...(revision?.client_visible ? [revision] : [])] });
      });
      await endpoint(context, '/rest/v1/files', 'GET', (route) =>
        route.fulfill({ headers, json: revision ? [revision, original] : [original] }),
      );
      await endpoint(context, '/rest/v1/rpc/generate_protocol', 'POST', (route) => {
        assert.deepEqual(route.request().postDataJSON(), { p_entity_type: 'DOC' });
        return route.fulfill({ headers, json: 'CALI-DOC-20261112-00' + (++generated + 1) });
      });
      await endpoint(context, '/rest/v1/files', 'POST', (route) => {
        const request = route.request();
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const body = request.postDataJSON();
        assert(stored.has(body.storage_path));
        inserts.push(body);
        if (inserts.length === 1)
          return route.fulfill({ headers, status: 503, json: { message: 'Falha temporária ao salvar revisão' } });
        revision = { ...body, id: revisionId, updated_at: timestamp, workflow_stage: 'ready_to_publish' };
        return route.fulfill({ headers, json: null });
      });
      await endpoint(context, '/rest/v1/files', 'PATCH', (route) => {
        const request = route.request();
        const id = new URL(request.url()).searchParams.get('id');
        assert.equal(id, 'eq.' + revisionId);
        const body = request.postDataJSON();
        publications.push(body);
        revision = { ...revision, ...body, workflow_stage: 'published' };
        return route.fulfill({ headers, json: null });
      });
      await endpoint(context, '/rest/v1/activity_log', 'POST', (route) => {
        audit.push(route.request().postDataJSON());
        return route.fulfill({ headers, json: null });
      });
      await context.route(
        (url) => url.origin === host && url.pathname.startsWith(storagePrefix),
        (route) => {
          const request = route.request();
          if (request.method() === 'POST') {
            const path = decodeURIComponent(new URL(request.url()).pathname.slice(storagePrefix.length + 1));
            assert.match(
              path,
              new RegExp('^documents/' + companyId + '/CALI-DOC-20261112-00[23]/file-\\d+-revisao.pdf$'),
            );
            newUploads.push(path);
            stored.add(path);
            return route.fulfill({ headers, json: { Key: 'cali-workspace-private/' + path } });
          }
          if (request.method() === 'DELETE') {
            const { prefixes } = request.postDataJSON();
            deletes.push(...prefixes);
            for (const path of prefixes) stored.delete(path);
            return route.fulfill({ headers, json: [] });
          }
          return route.fallback();
        },
      );

      await page.clock.setFixedTime(new Date(timestamp));
      await page.goto(origin + '/admin/documentos?documento=' + original.id);
      const first = page.getByRole('dialog', { name: original.title, exact: true });
      await first.getByText(original.protocol, { exact: true }).waitFor();
      await first.getByRole('button', { name: 'Nova versão', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Editar documento', exact: true });
      const save = editor.getByRole('button', { name: 'Salvar documento', exact: true });
      assert(await save.isDisabled());
      assert.equal(await editor.getByLabel('Versão', { exact: true }).inputValue(), 'v2.0');
      await editor.getByRole('textbox', { name: 'Nome do documento' }).fill(revisedTitle);
      await editor
        .locator('input[type=file]')
        .first()
        .setInputFiles({ name: 'revisao.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nQA') });
      await save.click();
      await editor.getByText('Não foi possível salvar o documento.', { exact: true }).waitFor();
      assert.deepEqual(deletes, [newUploads[0]]);
      assert(stored.has(original.storage_path));
      await save.click();
      await editor.waitFor({ state: 'hidden' });
      assert.equal(inserts.length, 2);
      assert.equal(revision.status, 'draft');
      assert.equal(revision.client_visible, false);
      assert.equal(revision.revision_of_id, original.id);
      assert.equal(revision.uploaded_by, user.id);
      assert.equal(revision.company_id, companyId);
      assert.equal(revision.version_label, 'v2.0');
      assert.equal(revision.requires_acknowledgement, true);
      assert.equal(revision.storage_path, newUploads[1]);

      await client.page.goto(origin + '/cliente/documentos');
      const oldCard = client.page.getByRole('heading', { name: original.title, exact: true });
      const newCard = client.page.getByRole('heading', { name: revisedTitle, exact: true });
      await oldCard.waitFor();
      assert.equal(await newCard.count(), 0);
      await page.getByRole('button', { name: 'Abrir ' + revisedTitle, exact: true }).click();
      const next = page.getByRole('dialog', { name: revisedTitle, exact: true });
      await next.getByRole('button', { name: 'Publicar', exact: true }).click();
      await next.waitFor({ state: 'hidden' });
      await client.page.reload();
      await newCard.waitFor();
      await oldCard.waitFor();
      assert.deepEqual(publications, [
        { status: 'published', client_visible: true, is_final: true, published_at: timestamp },
      ]);
      assert.deepEqual(
        audit.map((item) => item.event_type),
        ['document_revision_created', 'document_published'],
      );
      assert.deepEqual([...stored], [original.storage_path, revision.storage_path]);
      return {
        priorVersionPreserved: true,
        cleanupAfterInsertFailure: true,
        explicitPublication: true,
        separatePrivateBytes: true,
      };
    },
  },
  {
    id: '16-admin-audit-filter-and-trail',
    role: 'admin',
    async run({ page, context, origin }) {
      const headers = { 'access-control-allow-origin': origin };
      const base = {
        company_id: companyId,
        created_at: '2026-11-11T15:00:00Z',
        metadata: { protocol: 'QA-AUDIT-001' },
      };
      const events = [
        { ...base, id: 21, event_type: 'timer_paused' },
        { ...base, id: 22, event_type: 'report_approved' },
        {
          ...base,
          id: 23,
          event_type: 'preview_render_error',
          metadata: { title: 'Diagnóstico privado QA' },
        },
      ];
      let restricted = true;
      await endpoint(context, '/rest/v1/activity_log', 'GET', (route) => route.fulfill({ json: events, headers }));
      await endpoint(context, '/rest/v1/team_private_audit', 'GET', (route) =>
        route.fulfill(
          restricted ? { status: 403, json: { message: 'Sem acesso à fonte' }, headers } : { json: [], headers },
        ),
      );
      await page.clock.setFixedTime(new Date('2026-11-12T16:00:00Z'));
      await page.goto(origin + '/admin/auditoria');
      const list = page.locator('.v2-audit-list');
      const report = list.getByText('Aprovou o relatório', { exact: true });
      const hours = list.getByText('Pausou o cronômetro', { exact: true });
      await report.waitFor();
      await hours.waitFor();
      assert.equal(await list.getByText('Diagnóstico privado QA').count(), 0);
      const partial = page.getByText('Auditoria incompleta:', { exact: true });
      await partial.waitFor();
      await page.getByRole('combobox', { name: 'Área', exact: true }).selectOption('Relatórios');
      await hours.waitFor({ state: 'detached' });
      await list.getByRole('button', { name: 'QA-AUDIT-001' }).click();
      await page.getByRole('heading', { name: 'QA-AUDIT-001' }).waitFor();
      await hours.waitFor();
      await page.getByRole('button', { name: 'Voltar para a lista' }).click();
      await hours.waitFor({ state: 'detached' });

      restricted = false;
      await page.locator('.v2-head-actions').getByRole('button', { name: 'Atualizar', exact: true }).click();
      await partial.waitFor({ state: 'detached' });
      await report.waitFor();
    },
  },
  {
    id: '17-admin-forms-restore-retry',
    role: 'admin',
    async run({ page, context, origin }) {
      const restored = {
        id: 'restored-qa-form',
        slug: 'formulario-restaurado-qa',
        title: 'Pesquisa restaurada QA',
        category: 'CALI Forms',
        status: 'open',
        audience: 'cali',
        questions: [{ id: 'qa-restore-name', kind: 'short_text', label: 'Nome', required: true }],
        updated_at: '2026-11-12T15:00:00Z',
      };
      const deleted = {
        id: 'trash-qa',
        kind: 'form',
        form_title: restored.title,
        responses: [{ id: 'original-response' }],
        deleted_at: '2026-11-10T15:00:00Z',
      };
      let isRestored = false;
      const writes = [];
      const headers = { 'access-control-allow-origin': origin };
      await endpoint(context, '/rest/v1/forms', 'GET', (route) =>
        route.fulfill({ json: isRestored ? [restored] : [], headers }),
      );
      await endpoint(context, '/rest/v1/forms_trash', 'GET', (route) =>
        route.fulfill({ json: isRestored ? [] : [deleted], headers }),
      );
      await endpoint(context, '/rest/v1/rpc/admin_form_overview', 'POST', (route) =>
        route.fulfill({
          json: isRestored ? [{ form_id: restored.id, responses: 1, last_response: restored.updated_at }] : [],
          headers,
        }),
      );
      await endpoint(context, '/rest/v1/rpc/cali_forms_trash_restore', 'POST', (route) => {
        writes.push({
          profile: route.request().headers()['content-profile'],
          body: route.request().postDataJSON(),
        });
        if (writes.length === 1)
          return route.fulfill({
            status: 409,
            json: { code: '23505', message: 'Já existe um formulário com esse endereço.' },
            headers,
          });
        isRestored = true;
        return route.fulfill({ json: true, headers });
      });
      await endpoint(context, '/rest/v1/rpc/cali_form_public', 'POST', (route) => {
        const body = route.request().postDataJSON();
        return route.fulfill({ json: isRestored && body.p_slug === restored.slug ? restored : null, headers });
      });

      await page.goto(origin + '/admin/formularios', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^Lixeira/ }).click();
      await page.getByText('Excluídos nos últimos 30 dias', { exact: true }).waitFor();
      await page.getByText('Formulário e 1 resposta', { exact: true }).waitFor();
      const restore = page.getByRole('button', { name: 'Restaurar', exact: true });
      await restore.click();
      const collision = page.getByRole('alert').filter({ hasText: 'Já existe um formulário com esse endereço.' });
      await collision.waitFor();
      await restore.click();
      await collision.waitFor({ state: 'detached' });
      const row = page.getByRole('button').filter({ hasText: restored.title }).first();
      await row.waitFor();
      assert.match(await row.textContent(), /formulario-restaurado-qa/);
      await page.getByRole('button', { name: /^Lixeira/ }).click();
      await page.getByText('A lixeira está vazia.', { exact: true }).waitFor();
      assert.deepEqual(
        writes,
        Array.from({ length: 2 }, () => ({ profile: 'public', body: { p_id: deleted.id } })),
      );
      await page.goto(origin + '/f/' + restored.slug, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: restored.title, exact: true }).waitFor();
      return { originalPublicSlug: true, publicSchema: true, conflictRetry: true };
    },
  },
  {
    id: '11-client-document-private-download-retry',
    role: 'client',
    async run({ page, context, origin }) {
      const title = 'Documento privado QA';
      const filename = 'ciclo QA.txt';
      const path = 'documents/' + companyId + '/' + filename;
      const storagePath = '/storage/v1/object/authenticated/cali-workspace-private/' + path;
      const content = 'Conteúdo sintético de teste';
      const reads = [];
      const views = [];
      const headers = { 'access-control-allow-origin': origin };
      await endpoint(context, '/rest/v1/files', 'GET', (route) =>
        route.fulfill({
          json: [
            {
              id: 'qa-private-file',
              company_id: companyId,
              title,
              protocol: 'QA-PRIVATE-001',
              category: 'other',
              document_kind: 'Política',
              version_label: '2',
              storage_path: path,
              updated_at: '2026-11-12T15:00:00Z',
              status: 'published',
              client_visible: true,
            },
          ],
          headers,
        }),
      );
      await endpoint(context, '/rest/v1/document_acknowledgements', 'GET', (route) =>
        route.fulfill({
          json: new URL(route.request().url()).searchParams.has('file_id') ? null : [],
          headers,
        }),
      );
      await endpoint(context, '/rest/v1/document_acknowledgements', 'POST', (route) => {
        const { company_id, file_id, status, viewed_at } = route.request().postDataJSON();
        views.push({ company_id, file_id, status, viewed_at: Boolean(viewed_at) });
        return route.fulfill({ status: 201, json: [], headers });
      });
      await context.route(
        (url) => url.origin === host && decodeURIComponent(url.pathname) === storagePath,
        (route) => {
          if (route.request().method() !== 'GET') return route.fallback();
          reads.push({ authorized: /^Bearer\s+\S+$/.test(route.request().headers().authorization || '') });
          if (reads.length === 1) return route.fulfill({ status: 403, json: { error: 'negado' }, headers });
          return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: content, headers });
        },
      );
      await page.goto(origin + '/cliente/documentos', { waitUntil: 'domcontentloaded' });
      const doc = page
        .getByRole('article')
        .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      await doc.getByText('QA-PRIVATE-001', { exact: true }).waitFor();
      const open = doc.getByRole('button', { name: 'Abrir', exact: true });
      await open.click();
      const denied = page.getByText('Não foi possível abrir este arquivo com seu acesso.', { exact: true });
      await denied.waitFor();
      assert.equal(views.length, 0);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.waitForResponse(
          (response) =>
            response.url() === host + '/rest/v1/document_acknowledgements' &&
            response.request().method() === 'POST',
        ),
        open.click(),
      ]);
      assert.equal(download.suggestedFilename(), filename);
      assert.equal(await readFile(await download.path(), 'utf8'), content);
      await denied.waitFor({ state: 'detached' });
      assert.deepEqual(reads, [{ authorized: true }, { authorized: true }]);
      assert.deepEqual(views, [
        { company_id: companyId, file_id: 'qa-private-file', status: 'viewed', viewed_at: true },
      ]);
      return { authenticatedPath: true, failWithoutView: true, retryBytesAndView: true };
    },
  },
];

browserSuite(cases).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
