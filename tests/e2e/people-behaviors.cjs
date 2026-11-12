'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { companyId, tables } = require('./fixtures.cjs');

const apiOrigin = 'https://cali-local-qa.supabase.co';

function endpoint(context, pathname, method, handler) {
  return context.route(
    (url) => url.origin === apiOrigin && url.pathname === pathname,
    (route) => (route.request().method() === method ? handler(route) : route.fallback()),
  );
}

const cases = [
  {
    id: '17-mapa-report-mobile-actions-and-iframe',
    role: 'admin',
    width: 390,
    async run({ page, context, origin, snapshot }) {
      const loads = [];
      await context.route('https://mapa.calirh.com/relatorio.html?**', (route) => {
        const url = new URL(route.request().url());
        loads.push(Object.fromEntries(url.searchParams));
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8">
          <h1 style="margin-top:70px">Relatório de Mapa QA</h1><p id="status"></p>
          <script>window.addEventListener('message', (event) => {
            if (event.data?.type === 'CALI_MAPA_PRINT_REQUEST') document.querySelector('#status').textContent = 'Impressão solicitada';
          });</script>` });
      });
      await page.goto(origin + '/admin/mapa-de-people/relatorio/qa-map');
      const frame = page.frameLocator('iframe[title="Mapa de People — Relatório oficial"]');
      await frame.getByRole('heading', { name: 'Relatório de Mapa QA' }).waitFor();
      const print = page.getByRole('button', { name: 'Imprimir / Salvar PDF' });
      const refresh = page.getByRole('button', { name: 'Atualizar', exact: true });
      const original = page.getByRole('link', { name: 'Abrir original' });
      const back = page.getByRole('button', { name: 'Painel do Mapa' });
      for (const action of [back, refresh, original, print]) {
        const box = await action.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= 390, 'Ação do relatório cortada em 390 px');
      }
      assert.equal(await original.getAttribute('href'), 'https://mapa.calirh.com/relatorio.html?id=qa-map');
      await snapshot('relatorio-mobile');
      await print.click();
      await frame.getByText('Impressão solicitada').waitFor();
      await refresh.click();
      await frame.getByRole('heading', { name: 'Relatório de Mapa QA' }).waitFor();
      assert.deepEqual(loads, ['0', '1'].map((v) => ({ id: 'qa-map', workspace: '1', v })));
      await back.click();
      await page.waitForURL((url) => url.pathname === '/admin/mapa-de-people');
    },
  },
  {
    id: '08-team-private-fields-by-role',
    role: 'client',
    async run({ page, context, origin, openActor }) {
      const member = tables.team_members[0];
      const privateRequests = [];
      const privatePath = '/rest/v1/team_member_private';
      const headers = { 'access-control-allow-origin': origin };
      await endpoint(context, privatePath, 'GET', (route) => {
        privateRequests.push(new URL(route.request().url()).searchParams.get('company_id'));
        return route.fulfill({
          json: [{ member_id: member.id, salary: 4321.75, salary_review_date: '2026-10-01', has_children: 'yes' }],
          headers,
        });
      });

      async function openMember(actor, path) {
        await actor.goto(origin + path, { waitUntil: 'domcontentloaded' });
        await actor.getByRole('button', { name: 'Abrir ficha de ' + member.full_name, exact: true }).click();
        const drawer = actor.getByRole('dialog', { name: 'Ficha de ' + member.full_name, exact: true });
        await drawer.getByText(member.employee_code, { exact: true }).waitFor();
        return drawer;
      }

      const clientDrawer = await openMember(page, '/cliente/equipe?aba=diretorio');
      await clientDrawer.getByText('Dados privados da empresa', { exact: true }).waitFor();
      assert.match(await clientDrawer.getByText(/^Remuneração/).innerText(), /R\$\s*4\.321,75/);
      await clientDrawer.getByText('Tem filhos · Sim', { exact: true }).waitFor();
      assert.deepEqual(privateRequests, ['eq.' + companyId]);

      const partner = await openActor('partner');
      const partnerRequests = [];
      await endpoint(partner.context, privatePath, 'GET', (route) => {
        partnerRequests.push(route.request().url());
        return route.fulfill({ status: 403, json: { message: 'Campo privado' }, headers });
      });
      const partnerDrawer = await openMember(partner.page, '/equipe/pessoas');
      assert.equal(await partnerDrawer.getByText('Dados privados da empresa', { exact: true }).count(), 0);
      assert.equal(await partnerDrawer.getByText(/^Remuneração/).count(), 0);
      assert.deepEqual(partnerRequests, []);
      return { sameEmployee: true, clientPrivateData: true, partnerPrivateRequests: 0 };
    },
  },
  {
    id: '17-disc-public-opt-out',
    role: 'public',
    async run({ page, context, origin }) {
      const activeToken = 'db000000-0000-4000-8000-000000000001';
      const missingToken = 'db000000-0000-4000-8000-000000000002';
      const requests = [];
      let finish;
      const responseGate = new Promise((resolve) => { finish = resolve; });
      await endpoint(context, '/rest/v1/rpc/cali_profile_invite_decline', 'POST', async (route) => {
        const request = route.request();
        const body = request.postDataJSON();
        const headers = request.headers();
        requests.push({ body, profile: headers['content-profile'], authorization: headers.authorization });
        if (body.p_token === activeToken) await responseGate;
        return route.fulfill({ json: { ok: body.p_token === activeToken }, headers: { 'access-control-allow-origin': origin } });
      });

      try {
        await page.goto(origin + '/perfil/sair/' + activeToken, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Não quer participar?', exact: true }).waitFor();
        assert.deepEqual(requests, []);
        await page.getByRole('button', { name: 'Não quero participar', exact: true }).click();
        const pending = page.getByRole('button', { name: 'Encerrando…', exact: true });
        await pending.waitFor();
        assert.equal(await pending.isDisabled(), true);
        await pending.press('Enter');
        finish();
        await page.getByRole('heading', { name: 'Pronto.', exact: true }).waitFor();
        await page.getByText(/Você não vai receber mais mensagens/).waitFor();
        assert.equal(requests.length, 1);

        await page.goto(origin + '/perfil/sair/' + missingToken, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Não quero participar', exact: true }).click();
        await page.getByRole('heading', { name: 'Não foi possível', exact: true }).waitFor();
        await page.getByText('Este convite já foi respondido ou não existe mais.', { exact: true }).waitFor();
        assert.deepEqual(requests, [activeToken, missingToken].map((token) => ({
          body: { p_token: token }, profile: 'public', authorization: undefined,
        })));
      } finally {
        finish();
      }
      return { explicitConsent: true, anonymousRpc: true, duplicateBlocked: true, unavailableInvite: true };
    },
  },
];

if (require.main === module) browserSuite(cases).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = cases;
