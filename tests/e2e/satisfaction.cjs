'use strict';

const assert = require('node:assert/strict');
const { answerWorkspaceDialog, browserSuite } = require('./browser-suite.cjs');

const endpoint = 'https://cali-local-qa.supabase.co/rest/v1';
const companies = { a: 'Empresa Alfa QA', b: 'Empresa Beta QA' };
const november = '2026-11';
const stamp = (date) => (date ? date + 'T15:00:00Z' : null);

function closure(id, company, date, title, state = {}) {
  return {
    id,
    closed_at: stamp(date),
    answered_at: stamp(state.answered),
    superseded_at: stamp(state.superseded),
    closed_unanswered_at: stamp(state.closed),
    account_records: { company_id: company, title, companies: { display_name: companies[company] } },
  };
}

function response(record, score) {
  return {
    id: record.id + '-response',
    companyId: record.account_records.company_id,
    company: record.account_records.companies.display_name,
    cohortAt: record.closed_at,
    createdAt: record.answered_at,
    sourceType: 'record',
    title: record.account_records.title,
    score,
  };
}

async function installFixture(context, origin, { paginated = false } = {}) {
  const late = closure('alpha-late', 'a', '2026-11-04', 'Resposta tardia Alfa', { answered: '2026-12-02' });
  const old = closure('alpha-old', 'a', '2026-10-22', 'Encerrada em outubro', { answered: '2026-11-06' });
  const beta = closure('beta', 'b', '2026-11-10', 'Resposta Beta', { answered: '2026-11-12' });
  const waiting = closure('alpha-waiting', 'a', '2026-11-18', 'Aguardando Alfa');
  const closed = closure('alpha-closed', 'a', '2026-11-20', 'Espera encerrada Alfa', { closed: '2026-11-27' });
  const reopened = closure('alpha-reopened', 'a', '2026-11-23', 'Ocorrência reaberta Alfa', {
    superseded: '2026-11-28',
  });
  const rows = [reopened, closed, waiting, beta, late, old];
  const preceding = paginated
    ? Array.from({ length: 250 }, (_, index) =>
        closure('dec-' + index, 'b', '2026-12-04', 'Outro mês', { closed: '2026-12-12' }),
      )
    : [];
  const offsets = new Set();
  const writes = [];
  const cors = { 'access-control-allow-origin': origin };
  await context.route(
    (url) => url.origin + url.pathname === endpoint + '/account_record_closures',
    (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const params = new URL(route.request().url()).searchParams;
      const offset = Number(params.get('offset') || 0);
      const limit = Number(params.get('limit') || 250);
      offsets.add(offset);
      return route.fulfill({ json: [...preceding, ...rows].slice(offset, offset + limit), headers: cors });
    },
  );
  await context.route(endpoint + '/rpc/get_admin_satisfaction_responses_v39', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          json: [response(late, 5), response(old, 1), response(beta, 2)],
          headers: cors,
        })
      : route.fallback(),
  );
  await context.route(endpoint + '/rpc/close_account_record_feedback_request', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes.push(route.request().postDataJSON());
    waiting.closed_unanswered_at = stamp('2026-12-15');
    return route.fulfill({ json: true, headers: cors });
  });
  return { offsets, writes };
}

async function novemberForAlpha(page, origin) {
  await page.clock.setFixedTime(new Date('2026-12-15T15:00:00Z'));
  await page.goto(origin + '/admin/satisfacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Satisfação', exact: true }).waitFor();
  await page.getByLabel('De', { exact: true }).fill(november + '-01');
  await page.getByLabel('Até', { exact: true }).fill(november + '-30');
  await page.getByRole('combobox', { name: 'Empresa', exact: true }).selectOption({ label: companies.a });
}

function metric(page, label, value) {
  return page
    .locator('article')
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByText(value, { exact: true });
}

const cases = [
  {
    id: '16-satisfaction-closure-cohort',
    role: 'admin',
    async run({ page, context, origin }) {
      const { offsets } = await installFixture(context, origin, { paginated: true });
      await novemberForAlpha(page, origin);
      await page
        .getByText('4 solicitadas · 1 respondidas · 1 aguardando · 2 encerradas sem resposta', { exact: true })
        .waitFor();
      await page.getByText('Resposta tardia Alfa', { exact: true }).waitFor();
      assert.equal(await page.getByText('Encerrada em outubro', { exact: true }).count(), 0);
      assert.equal(await page.getByText('Resposta Beta', { exact: true }).count(), 0);
      await metric(page, 'Taxa de resposta', '25%').waitFor();
      await metric(page, 'Índice de satisfação', '5,0/5').waitFor();
      assert.deepEqual(
        [...offsets].sort((a, b) => a - b),
        [0, 250],
      );

      await page.emulateMedia({ media: 'print' });
      await page.getByText(/^Empresa Alfa QA · 01\/11\/2026 a 30\/11\/2026/).waitFor();
      await metric(page, 'Taxa de resposta', '25%').waitFor();
      await page.emulateMedia({ media: 'screen' });

      await page.getByRole('combobox', { name: 'Empresa', exact: true }).selectOption({ label: companies.b });
      await page
        .getByText('1 solicitadas · 1 respondidas · 0 aguardando · 0 encerradas sem resposta', { exact: true })
        .waitFor();
      await page.getByText('Resposta Beta', { exact: true }).waitFor();
      assert.equal(await page.getByText('Resposta tardia Alfa', { exact: true }).count(), 0);
      await metric(page, 'Taxa de resposta', '100%').waitFor();
      await metric(page, 'Índice de satisfação', '2,0/5').waitFor();
      return { pages: [...offsets], lateResponseInClosingCohort: true, companyFilter: true, printCohort: true };
    },
  },
  {
    id: '16-satisfaction-close-waiting',
    role: 'admin',
    async run({ page, context, origin }) {
      const { writes } = await installFixture(context, origin);
      await novemberForAlpha(page, origin);
      const request = page.getByRole('listitem').filter({ hasText: 'Aguardando Alfa' });
      const close = request.getByRole('button', { name: 'Encerrar espera', exact: true });
      await close.click();
      await answerWorkspaceDialog(page, false);
      await request.waitFor();
      assert.equal(writes.length, 0);
      await close.click();
      await answerWorkspaceDialog(page, true);
      await request.waitFor({ state: 'detached' });
      await page
        .getByText('4 solicitadas · 1 respondidas · 0 aguardando · 3 encerradas sem resposta', { exact: true })
        .waitFor();
      await metric(page, 'Taxa de resposta', '25%').waitFor();
      assert.deepEqual(writes, [{ p_closure_id: 'alpha-waiting' }]);
      return { dismissPreservesWaiting: true, closeKeepsDenominator: true };
    },
  },
];

browserSuite(cases).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
