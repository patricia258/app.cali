'use strict';

const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co';

function endpoint(context, pathname, method, handler) {
  return context.route(
    (url) => url.origin === host && url.pathname === pathname,
    (route) => (route.request().method() === method ? handler(route) : route.fallback()),
  );
}

const cases = [
  {
    id: '16-admin-audit-filter-and-trail',
    role: 'admin',
    async run({ page, context, origin }) {
      const headers = { 'access-control-allow-origin': origin };
      const base = { company_id: companyId, created_at: '2026-11-11T15:00:00Z', metadata: { protocol: 'QA-AUDIT-001' } };
      const events = [
        { ...base, id: 'qa-hours', event_type: 'timer_paused' },
        { ...base, id: 'qa-report', event_type: 'report_approved' },
        { ...base, id: 'qa-debug', event_type: 'preview_render_error', metadata: { title: 'Diagnóstico privado QA' } },
      ];
      let restricted = true;
      await endpoint(context, '/rest/v1/activity_log', 'GET', (route) => route.fulfill({ json: events, headers }));
      await endpoint(context, '/rest/v1/team_private_audit', 'GET', (route) => route.fulfill(restricted
        ? { status: 403, json: { message: 'Sem acesso à fonte' }, headers }
        : { json: [], headers }));
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
