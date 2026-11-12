'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables, user } = require('./fixtures.cjs');

const host = 'https://cali-local-qa.supabase.co/rest/v1/';

browserSuite([
  {
    id: 'hours-capacity-reviews-follow-selected-company',
    role: 'admin',
    async run({ page, context, origin, snapshot }) {
      const companyB = '9b110000-0000-4000-8000-000000000002';
      const nameA = tables.companies[0].display_name;
      const nameB = 'Empresa B de QA';
      const detailA = 'Avaliação exclusiva da empresa A.';
      const detailB = 'Avaliação exclusiva da empresa B.';
      const headers = { 'access-control-allow-origin': origin };
      let releaseA;
      const waitA = new Promise((resolve) => {
        releaseA = resolve;
      });
      let releaseOctober;
      const waitOctober = new Promise((resolve) => {
        releaseOctober = resolve;
      });
      await context.route(host + 'companies?**', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const select = new URL(route.request().url()).searchParams.get('select');
        if (!select?.startsWith('id,display_name,logo_url,monthly_hours')) return route.fallback();
        return route.fulfill({
          json: [tables.companies[0], { ...tables.companies[0], id: companyB, display_name: nameB }],
          headers,
        });
      });
      await context.route(host + 'rpc/admin_capacity_overview', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        const { p_month: month } = route.request().postDataJSON();
        const row = {
          contracted_minutes: 1200,
          used_minutes: 1340,
          excess_months: 2,
          window_months: 3,
          paused: false,
          events: ['m75'],
        };
        const first = { ...row, company_id: companyId };
        const second = { ...row, company_id: companyB, used_minutes: 1090 };
        if (month === '2026-10-01') await waitOctober;
        return route.fulfill({
          json: month === '2026-10-01' ? [first] : month === '2026-09-01' ? [second] : [first, second],
          headers,
        });
      });
      await context.route(host + 'rpc/admin_capacity_history', (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({
          json: [{ month: '2026-10-01', contracted_minutes: 1200, used_minutes: 850 }],
          headers,
        });
      });
      await context.route(host + 'capacity_reviews?**', async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const actor = new URL(route.request().url()).searchParams.get('company_id');
        assert.ok([companyId, companyB].map((id) => 'eq.' + id).includes(actor));
        const isA = actor === 'eq.' + companyId;
        if (isA) await waitA;
        return route.fulfill({
          json: [
            {
              id: actor,
              company_id: actor.slice(3),
              analysis: isA ? detailA : detailB,
              decision: 'monitor',
              communicated: false,
              created_at: '2026-11-12T12:00:00Z',
            },
          ],
          headers,
        });
      });
      await page.clock.setFixedTime(new Date('2026-11-12T16:00:00Z'));
      await page.goto(origin + '/admin/horas');
      const area = page.locator('.v2-capadmin');
      const row = (name) => area.getByRole('article').filter({ hasText: name });
      await row(nameA).getByRole('button', { name: 'Histórico e avaliação' }).click();
      await row(nameB).getByRole('button', { name: 'Histórico e avaliação' }).click();
      await row(nameB).getByText(detailB, { exact: true }).waitFor();
      const older = page.waitForResponse(
        (response) =>
          response.url().startsWith(host + 'capacity_reviews?') &&
          new URL(response.url()).searchParams.get('company_id') === 'eq.' + companyId,
      );
      releaseA();
      const response = await older;
      await response.finished();
      await row(nameB).getByRole('textbox', { name: 'Análise' }).focus();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(await row(nameB).getByText(detailA, { exact: true }).count(), 0);
      await row(nameB).getByText(detailB, { exact: true }).waitFor();
      await snapshot('historico-empresa-b', area);

      await row(nameA).getByRole('button', { name: 'Pausar até o próximo mês' }).click();
      await row(nameA).getByRole('button', { name: 'Sim, pausar' }).waitFor();
      const period = page.locator('input[type="month"]').first();
      const octoberRequest = page.waitForRequest(
        (request) =>
          request.url() === host + 'rpc/admin_capacity_overview' &&
          request.method() === 'POST' &&
          request.postDataJSON()?.p_month === '2026-10-01',
      );
      await period.fill('2026-10');
      await octoberRequest;
      await period.fill('2026-09');
      await row(nameB).waitFor();
      await row(nameA).waitFor({ state: 'detached' });
      const octoberResponse = page.waitForResponse(
        (result) =>
          result.url() === host + 'rpc/admin_capacity_overview' &&
          result.request().method() === 'POST' &&
          result.request().postDataJSON()?.p_month === '2026-10-01',
      );
      releaseOctober();
      await (await octoberResponse).finished();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(await row(nameA).count(), 0);
      assert.equal(await area.getByRole('button', { name: 'Sim, pausar' }).count(), 0);
    },
  },
  {
    id: '07-capacity-review-pause-and-resume-preserve-company-month-and-actor',
    role: 'admin',
    async run({ page, context, origin }) {
      const stamp = '2026-11-12T16:00:00.000Z';
      const month = '2026-11-01';
      const headers = { 'access-control-allow-origin': origin };
      const writes = [];
      let paused = false;
      let reviewAttempts = 0;
      await context.route(host + 'rpc/admin_capacity_overview', (route) => {
        assert.deepEqual(route.request().postDataJSON(), { p_month: month });
        return route.fulfill({
          headers,
          json: [
            {
              company_id: companyId,
              contracted_minutes: 1200,
              used_minutes: 1340,
              excess_months: 2,
              window_months: 3,
              events: ['m75'],
              paused,
            },
          ],
        });
      });
      await context.route(host + 'rpc/admin_capacity_history', (route) => {
        assert.deepEqual(route.request().postDataJSON(), { p_month: month, p_company_id: companyId });
        return route.fulfill({ headers, json: [] });
      });
      await context.route(host + 'capacity_reviews**', (route) => {
        const request = route.request();
        if (request.method() === 'GET') return route.fulfill({ headers, json: [] });
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        const body = request.postDataJSON();
        writes.push(['review', body]);
        if (++reviewAttempts === 1)
          return route.fulfill({ headers, status: 503, json: { message: 'Falha temporária' } });
        return route.fulfill({ headers, json: { ...body, id: 'qa-capacity-review', created_at: stamp } });
      });
      await context.route(host + 'capacity_pauses**', (route) => {
        const request = route.request();
        const params = new URL(request.url()).searchParams;
        assert.equal(request.headers()['content-profile'], 'cali_workspace');
        if (request.method() === 'POST') {
          assert.equal(params.get('on_conflict'), 'company_id,month');
          paused = true;
        } else {
          assert.equal(request.method(), 'PATCH');
          assert.equal(params.get('company_id'), 'eq.' + companyId);
          assert.equal(params.get('month'), 'eq.' + month);
          paused = false;
        }
        writes.push([request.method(), request.postDataJSON()]);
        return route.fulfill({ headers, json: null });
      });

      await page.clock.setFixedTime(new Date(stamp));
      await page.goto(origin + '/admin/horas');
      const card = page
        .locator('.v2-capadmin')
        .getByRole('article')
        .filter({ hasText: tables.companies[0].display_name });
      await card.getByRole('button', { name: 'Histórico e avaliação' }).click();
      const submit = card.getByRole('button', { name: 'Registrar avaliação' });
      assert(await submit.isDisabled());
      const analysis = card.getByRole('textbox', { name: 'Análise' });
      await analysis.fill('  Ajustar prioridades QA.  ');
      await card.getByLabel(/^Encaminhamento/).selectOption('reprioritize');
      await card.getByRole('checkbox', { name: 'Já comunicado ao cliente' }).check();
      await submit.click();
      await page.getByText('Não foi possível registrar a avaliação. Tente de novo.').waitFor();
      assert.equal(await analysis.inputValue(), '  Ajustar prioridades QA.  ');
      await submit.click();
      await card.getByRole('listitem').getByText('Ajustar prioridades QA.', { exact: true }).waitFor();
      assert.equal(await analysis.inputValue(), '');
      const pause = card.getByRole('button', { name: 'Pausar até o próximo mês' });
      await pause.click();
      await card.getByRole('button', { name: 'Voltar', exact: true }).click();
      assert.equal(writes.length, 2);
      await pause.click();
      await card.getByRole('button', { name: 'Sim, pausar' }).click();
      const resume = card.getByRole('button', { name: 'Retomar', exact: true });
      await resume.waitFor();
      await resume.click();
      await pause.waitFor();
      const review = {
        company_id: companyId,
        month,
        analysis: 'Ajustar prioridades QA.',
        decision: 'reprioritize',
        communicated: true,
        created_by: user.id,
      };
      assert.deepEqual(writes, [
        ['review', review],
        ['review', review],
        [
          'POST',
          {
            company_id: companyId,
            month,
            paused_by: user.id,
            paused_at: stamp,
            resumed_at: null,
            resumed_by: null,
          },
        ],
        ['PATCH', { resumed_at: stamp, resumed_by: user.id }],
      ]);
      return { reviewRetried: true, pauseConfirmed: true, resumeScoped: true };
    },
  },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
