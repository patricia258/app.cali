'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

const fixtureHost = 'https://cali-local-qa.supabase.co';
const reportId = 'c0111111-1111-4111-8111-111111111112';
const protocol = 'CALI-RPT-QA-002';
const clock = '2026-11-30T16:00:00.000Z';
const period = { start: '2026-11-01', end: '2026-11-30', months: 1 };
const periodRequest = { p_company_id: companyId, p_period_start: period.start, p_period_end: period.end };

function rest(context, origin, endpoint, method, respond) {
  return context.route(
    (url) => url.origin === fixtureHost && url.pathname === '/rest/v1/' + endpoint,
    (route) => {
      const request = route.request();
      if (request.method() !== method) return route.fallback();
      const response = respond(request, new URL(request.url()).searchParams);
      return route.fulfill({
        json: response,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
        },
      });
    },
  );
}

browserSuite([
  {
    id: '12-admin-report-preview-draft-autosave-review-and-freeze',
    role: 'admin',
    timezoneId: 'America/Sao_Paulo',
    async run({ page, context, origin }) {
      const snapshot = { ...tables.reports[0].source_snapshot, generatedAt: clock, period };
      const performance = {
        deliverable_id: 'c0111111-1111-4111-8111-111111111113',
        company_id: companyId,
        title: 'Plano operacional QA',
        status: 'approved',
        effective_due_at: '2026-11-20',
        completion_at: '2026-11-20',
        delivery_timing: 'on_time',
        total_minutes: 90,
      };
      const inserts = [];
      const patches = [];
      const audit = [];
      let row = null;
      let sourceChanged = false;
      let readinessReached = false;
      await page.clock.setFixedTime(new Date(clock));
      await rest(context, origin, 'reports', 'GET', (request, params) => {
        const matches = row &&
          (!params.has('status') || params.get('status') !== 'in.(sent,published)') &&
          (!params.has('protocol') || params.get('protocol') === 'eq.' + protocol);
        return request.headers().accept?.includes('vnd.pgrst.object') ? (matches ? row : null) : matches ? [row] : [];
      });
      await rest(context, origin, 'reports', 'POST', (request) => {
        const payload = request.postDataJSON();
        inserts.push(payload);
        row = { ...payload, id: reportId, protocol, updated_at: clock };
        return { id: reportId };
      });
      await rest(context, origin, 'reports', 'PATCH', (request, params) => {
        assert.equal(params.get('id'), 'eq.' + reportId);
        assert.ok(row && ['draft', 'review'].includes(row.status), 'Escrita fora da fase editável');
        const payload = request.postDataJSON();
        patches.push(payload);
        row = { ...row, ...payload, updated_at: clock };
        return null;
      });
      await rest(context, origin, 'activity_log', 'POST', (request) => {
        audit.push(request.postDataJSON());
        return null;
      });
      await rest(context, origin, 'rpc/build_report_intelligence_snapshot', 'POST', (request) => {
        assert.deepEqual(request.postDataJSON(), periodRequest);
        return sourceChanged ? { ...snapshot, hours: { ...snapshot.hours, consumedMinutes: 900 } } : snapshot;
      });
      await rest(context, origin, 'rpc/build_report_monthly_series', 'POST', (request) => {
        assert.deepEqual(request.postDataJSON(), { ...periodRequest, p_period_start: '2026-06-01' });
        return [];
      });
      await rest(context, origin, 'rpc/report_generation_readiness_v61', 'POST', (request) => {
        assert.deepEqual(request.postDataJSON(), { ...periodRequest, p_report_type: 'monthly' });
        return {
          mode: readinessReached ? 'official' : 'preview',
          collected_days: readinessReached ? 30 : 12,
          required_days: 20,
          can_generate_official: readinessReached,
          can_send: readinessReached,
        };
      });
      await rest(context, origin, 'deliverable_delivery_performance', 'GET', () => [
        sourceChanged ? { ...performance, title: 'Alteração na origem QA' } : performance,
      ]);

      await page.goto(origin + '/admin/relatorios');
      const toolbar = page.locator('.reports-v16-toolbar');
      const create = toolbar.getByRole('button', { name: 'Criar fechamento oficial', exact: true });
      await toolbar.getByText('12 de 20 dias de coleta', { exact: true }).waitFor();
      assert.equal(await create.isDisabled(), true);
      assert.equal(await toolbar.getByRole('button', { name: 'Iniciar revisão' }).count(), 0);
      assert.deepEqual(inserts, []);
      assert.deepEqual(patches, []);

      readinessReached = true;
      await page.reload();
      await toolbar.getByText('30 de 20 dias de coleta', { exact: true }).waitFor();
      const editorial = page.locator('.reports-v16-editor-field')
        .filter({ has: page.getByRole('heading', { name: 'Leitura executiva do mês', exact: true }) }).getByRole('textbox');
      const initialSummary = 'Leitura executiva preparada na prévia QA.';
      const finalSummary = 'Leitura executiva revisada para o fechamento QA.';
      await editorial.fill(initialSummary);
      const complement = page.locator('.reports-v21-manual-group')
        .filter({ has: page.getByRole('heading', { name: 'Tempo complementar', exact: true }) });
      await complement.getByRole('button', { name: 'Adicionar', exact: true }).click();
      await complement.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Complemento de análise QA');
      await complement.getByRole('spinbutton', { name: 'Tempo (min)', exact: true }).fill('75');
      await toolbar.getByRole('button', { name: 'Visualizar prévia', exact: true }).click();
      const preview = page.getByRole('dialog', { name: 'Prévia do relatório', exact: true });
      await preview.getByText(initialSummary, { exact: true }).waitFor();
      await preview.getByRole('button', { name: 'Voltar', exact: true }).click();
      assert.deepEqual(inserts, []);
      assert.deepEqual(patches, []);

      await create.click();
      const startReview = toolbar.getByRole('button', { name: 'Iniciar revisão', exact: true });
      await startReview.waitFor();
      await page.getByText(protocol, { exact: true }).waitFor();
      assert.equal(inserts.length, 1);
      assert.equal(inserts[0].status, 'draft');
      assert.equal(inserts[0].version, 1);
      assert.equal(inserts[0].company_id, companyId);
      assert.equal(inserts[0].executive_summary, initialSummary);
      assert.equal(inserts[0].source_snapshot.workflow_mode, 'official');
      assert.deepEqual(inserts[0].source_snapshot.reportManual.timeEntries.map(({ description, minutes }) => ({ description, minutes })),
        [{ description: 'Complemento de análise QA', minutes: 75 }]);

      await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes('/rest/v1/reports?') && response.request().method() === 'PATCH' &&
          response.request().postDataJSON()?.executive_summary === finalSummary),
        editorial.fill(finalSummary),
      ]);
      await startReview.click();
      const approve = toolbar.getByRole('button', { name: 'Aprovar relatório', exact: true });
      await approve.waitFor();
      assert.equal(await editorial.inputValue(), finalSummary);
      await editorial.fill('');
      await approve.click();
      await page.getByText('A leitura executiva precisa estar preenchida antes da aprovação.', { exact: true }).waitFor();
      assert.equal(patches.some((patch) => patch.status === 'approved'), false);
      await editorial.fill(finalSummary);

      await approve.click();
      await toolbar.getByRole('button', { name: 'Enviar ao cliente', exact: true }).waitFor();
      assert.deepEqual(patches.flatMap((patch) => patch.status ? [patch.status] : []), ['review', 'approved']);
      const approval = patches.find((patch) => patch.status === 'approved');
      assert.equal(approval.approved_at, clock);
      assert.equal(approval.approved_by, user.id);
      assert.equal(approval.executive_summary, finalSummary);
      assert.equal(approval.source_snapshot.workflow_mode, 'official');
      assert.deepEqual(approval.source_snapshot.deliveryPerformanceV14, [performance]);
      assert.deepEqual(audit.map((event) => [event.entity_id, event.event_type]), [
        [reportId, 'report_draft_generated'], [reportId, 'report_approved'],
      ]);

      sourceChanged = true;
      await page.reload();
      await toolbar.getByRole('button', { name: 'Enviar ao cliente', exact: true }).waitFor();
      assert.equal(await editorial.evaluate((input) => input.readOnly), true);
      assert.equal(await editorial.inputValue(), finalSummary);
      await page.getByText(performance.title, { exact: true }).waitFor();
      assert.equal(await page.getByText('Alteração na origem QA', { exact: true }).count(), 0);
      assert.equal(await complement.getByRole('button', { name: 'Adicionar', exact: true }).isDisabled(), true);
      return { previewWrites: 0, explicitDraft: true, autosave: true, rejectedEmptyReview: true, approvedSnapshotFrozen: true };
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
