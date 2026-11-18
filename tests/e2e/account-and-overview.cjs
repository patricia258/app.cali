'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');
const { user, tables } = require('./fixtures.cjs');

const supportAddress = 'mailto:patricia@calirh.com?subject=Acesso%20ao%20CALI%20Workspace';
const privacyAddress = 'mailto:privacidade@calirh.com';
const profileTrigger = (page) => page.locator('.profile[aria-haspopup="menu"]');

async function openAccount(page, origin, path) {
  if (page.url() !== origin + path) await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
  await profileTrigger(page).click();
  await page.getByRole('menuitem', { name: 'Minha conta', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Minha conta', exact: true });
  await dialog.waitFor();
  assert.equal(await dialog.getByRole('link', { name: 'Problemas de acesso' }).getAttribute('href'), supportAddress);
  assert.equal(await dialog.getByRole('link', { name: 'Termos de Uso' }).getAttribute('href'), '/termos');
  const about = dialog.getByRole('region', { name: 'Sobre a CALI' });
  assert.equal(await about.getByRole('link', { name: 'Instagram' }).getAttribute('href'), 'https://www.instagram.com/calirh_/');
  assert.equal(await about.getByRole('link', { name: 'LinkedIn' }).getAttribute('href'), 'https://br.linkedin.com/company/cali-rh');
  return dialog;
}

function cors(route, origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*',
  };
}

async function loginSupport({ page, origin }) {
  await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Não consigo acessar' }).click();
  const help = page.getByRole('region', { name: 'Ajuda para acessar' });
  const link = await help.getByRole('link', { name: 'E-mail', exact: true }).getAttribute('href');
  assert.equal(link.split('&body=')[0], supportAddress);
  return { accessSupport: true };
}

async function clientAccount({ page, context, origin, snapshot }) {
  let userFilter;
  let posted;
  const requests = [{
    id: 'own-request', kind: 'correction', status: 'answered', answer: 'Resposta de teste da CALI.', created_at: '2026-11-01T13:00:00Z',
  }];
  await context.route((url) => url.pathname === '/rest/v1/data_subject_requests', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    userFilter = new URL(route.request().url()).searchParams.get('user_id');
    return route.fulfill({ json: requests, headers: cors(route, origin) });
  });
  await context.route((url) => url.pathname === '/rest/v1/rpc/request_data_subject_right', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    posted = route.request().postDataJSON();
    requests.unshift({ id: 'new-request', kind: posted.p_kind, status: 'open', answer: null, created_at: '2026-11-02T13:00:00Z' });
    return route.fulfill({ json: 'new-request', headers: cors(route, origin) });
  });
  const dialog = await openAccount(page, origin, '/cliente');
  await dialog.getByRole('link', { name: 'Pedidos sobre meus dados' }).click();
  const privacy = dialog.getByRole('region', { name: 'Privacidade e meus dados' });
  assert(await privacy.evaluate(element => document.activeElement === element), 'Foco segue para pedidos');
  await privacy.getByText('Meus pedidos de dados', { exact: true }).click();
  await privacy.getByText('Resposta de teste da CALI.', { exact: true }).waitFor();
  assert.match(userFilter, /^eq\.[a-f0-9-]{36}$/);
  await privacy.getByRole('button', { name: 'Pedir acesso, correção ou exclusão' }).click();
  await privacy.getByRole('textbox', { name: 'O que você precisa' }).fill('Pedido sintético para conferir o protocolo.');
  await privacy.getByRole('button', { name: 'Enviar pedido', exact: true }).click();
  await privacy.getByText('Aguardando resposta', { exact: false }).waitFor();
  assert.deepEqual(posted, { p_kind: 'access', p_details: 'Pedido sintético para conferir o protocolo.' });
  await snapshot('pedidos', dialog);
  await dialog.getByRole('link', { name: 'Acompanhar um assunto' }).click();
  await page.waitForURL(origin + '/cliente/registros');
  await dialog.waitFor({ state: 'hidden' });
  return { ownRequestQuery: true, requestSubmission: true, occurrences: true };
}

async function staffAccount({ page, origin }, { path, occurrences }) {
  const dialog = await openAccount(page, origin, path);
  assert.equal(await dialog.getByRole('link', { name: 'Pedidos sobre meus dados' }).getAttribute('href'), privacyAddress);
  assert.equal(await dialog.getByRole('button', { name: 'Pedir acesso, correção ou exclusão' }).count(), 0);
  const occurrenceLink = dialog.getByRole('link', { name: 'Acompanhar um assunto' });
  if (occurrences) assert.equal(await occurrenceLink.getAttribute('href'), occurrences);
  else assert.equal(await occurrenceLink.count(), 0);
  return { privacyEmail: true, occurrences: Boolean(occurrences) };
}

async function adminOverview({ page, context, origin, snapshot }) {
  const rows = Array.from({ length: 251 }, (_, index) => ({
    id: '11111111-1111-4111-8111-' + String(index + 1).padStart(12, '0'),
    display_name: 'Empresa sintética ' + String(index + 1).padStart(3, '0'),
    service_plan: 'partner', monthly_hours_contracted: 20,
  }));
  const last = rows.at(-1);
  const offsets = new Set();
  let eventFailure = true;
  let eventAttempts = 0;
  await context.route((url) => url.pathname === '/rest/v1/rpc/get_admin_satisfaction_overview', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({
      json: { average: null, total: 0, distribution: {}, monthly: [], recent: [] },
      headers: cors(route, origin),
    });
  });
  await context.route((url) => url.pathname === '/rest/v1/companies', async (route) => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    if (request.method() !== 'GET' || !params.get('select')?.includes('monthly_hours_contracted')) return route.fallback();
    const offset = Number(params.get('offset') ?? 0);
    const limit = Number(params.get('limit') ?? rows.length);
    offsets.add(offset);
    return route.fulfill({ json: rows.slice(offset, offset + limit), headers: cors(route, origin) });
  });
  await context.route((url) => url.pathname === '/rest/v1/events', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    eventAttempts++;
    return route.fulfill({
      status: eventFailure ? 400 : 200,
      json: eventFailure ? { message: 'Agenda indisponível no teste' } : [{
        id: 'qa-event-recovered', company_id: last.id, title: 'Agenda QA recuperada',
        starts_at: new Date(Date.now() + 86_400_000).toISOString(), event_type: 'meeting',
      }],
      headers: cors(route, origin),
    });
  });
  await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
  const alert = page.getByRole('alert').filter({ hasText: 'Falha ao atualizar Agenda' });
  await alert.waitFor();
  await page.getByRole('link', { name: /Contas ativas 251/ }).waitFor();
  assert(offsets.has(250), 'Carteira precisa consultar a segunda página');
  eventFailure = false;
  await alert.getByRole('button', { name: 'Tentar novamente' }).click();
  await alert.waitFor({ state: 'hidden' });
  await page.getByText('Agenda QA recuperada', { exact: true }).waitFor();
  assert(eventAttempts >= 2, 'A recuperação precisa chamar a fonte novamente');
  const accounts = page.getByRole('combobox', { name: 'Conta', exact: true });
  const months = page.getByRole('combobox', { name: 'Mês das horas', exact: true });
  await accounts.selectOption(last.id);
  const otherMonth = await months.locator('option').nth(1).getAttribute('value');
  await months.selectOption(otherMonth);
  await page.waitForURL((url) => url.searchParams.get('company') === last.id && url.searchParams.get('month') === otherMonth);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Contas ativas 1/ }).waitFor();
  assert.equal(await accounts.inputValue(), last.id);
  assert.equal(await months.inputValue(), otherMonth);
  await snapshot('recorte');
  return { companies: rows.length, pagination: [...offsets], retry: true, contextAfterReload: true };
}

const cases = [
  {
    id: 'admin-greeting-uses-own-profile-and-refreshes-after-edit',
    role: 'admin',
    async run({ page, context, origin }) {
      let stored = { ...tables.profiles[0], role: 'admin', full_name: '  Felipe da Silva  ', email: user.email };
      let finishRead;
      const pending = new Promise((resolve) => { finishRead = resolve; });
      let reads = 0;
      await context.addInitScript(({ id }) => {
        localStorage.setItem(`cali-workspace-profile-${id}`, JSON.stringify({ full_name: 'Patrícia Lima', email: 'old@example.invalid' }));
      }, user);
      await context.route((url) => url.pathname === '/rest/v1/profiles', async (route) => {
        const url = new URL(route.request().url());
        if (!url.searchParams.get('select')?.includes('signature_style')) return route.fallback();
        assert.equal(url.searchParams.get('id'), 'eq.' + user.id);
        reads++;
        await pending;
        return route.fulfill({ json: stored, headers: cors(route, origin) });
      });
      await context.route((url) => url.pathname === '/rest/v1/rpc/update_my_profile_v56', async (route) => {
        stored = { ...stored, full_name: route.request().postDataJSON().p_full_name };
        return route.fulfill({ json: true, headers: cors(route, origin) });
      });
      await page.goto(origin + '/admin');
      const greeting = page.getByRole('heading', { level: 2, name: /^(Bom dia|Boa tarde|Boa noite)/ });
      assert.match(await greeting.textContent(), /^(Bom dia|Boa tarde|Boa noite)\.$/);
      assert.equal(await profileTrigger(page).getByText('Patrícia', { exact: false }).count(), 0);
      finishRead();
      await page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite), Felipe\.$/ }).waitFor();
      await profileTrigger(page).getByText('Felipe da Silva', { exact: true }).waitFor();
      assert.equal(reads, 1, 'Saudação e menu compartilham a consulta do perfil.');
      const dialog = await openAccount(page, origin, '/admin');
      await dialog.getByLabel('Nome completo').fill('João QA');
      await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      await page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite), João\.$/ }).waitFor();
      await profileTrigger(page).getByText('João QA', { exact: true }).waitFor();
      return { ownProfile: true, ignoredLegacyCache: true, sharedRead: true, editedNameReflected: true };
    },
  },
  ...['empty', 'error'].map((mode) => ({
    id: 'admin-greeting-without-profile-' + mode,
    role: 'admin',
    async run({ page, context, origin }) {
      let savedName = '';
      let available = mode !== 'error';
      await context.route((url) => url.pathname === '/rest/v1/profiles', (route) => {
        const url = new URL(route.request().url());
        if (!url.searchParams.get('select')?.includes('signature_style')) return route.fallback();
        const fails = !available;
        return route.fulfill({
          status: fails ? 403 : 200,
          json: fails ? { message: 'Perfil indisponível' } : { ...tables.profiles[0], full_name: savedName, email: null, job_title: null },
          headers: cors(route, origin),
        });
      });
      await context.route((url) => url.pathname === '/rest/v1/rpc/update_my_profile_v56', (route) => {
        savedName = route.request().postDataJSON().p_full_name;
        return route.fulfill({ json: true, headers: cors(route, origin) });
      });
      await page.goto(origin + '/admin');
      await page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite)\.$/ }).waitFor();
      const dialog = await openAccount(page, origin, '/admin');
      assert.equal(await dialog.getByLabel('Nome completo').inputValue(), '');
      assert.equal(await dialog.getByLabel('E-mail de acesso').inputValue(), user.email);
      if (mode === 'error') {
        assert.equal(await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).isDisabled(), true);
        available = true;
        await dialog.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
        await dialog.locator('button:enabled').filter({ hasText: 'Salvar alterações' }).waitFor();
      }
      await dialog.getByLabel('Nome completo').fill('Renata QA');
      await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      await page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite), Renata\.$/ }).waitFor();
      return { neutralGreeting: true, authenticatedEmail: true, saveRecoversProfile: true };
    },
  })),

  { id: 'account-login-support', role: 'public', run: loginSupport },
  { id: 'account-client-privacy', role: 'client', run: clientAccount },
  { id: 'account-admin-links', role: 'admin', run: (ctx) => staffAccount(ctx, { path: '/admin', occurrences: '/admin/registros' }) },
  { id: 'account-partner-limited', role: 'partnerLimited', run: (ctx) => staffAccount(ctx, { path: '/equipe' }) },
  { id: 'overview-admin-pagination', role: 'admin', run: adminOverview },
  {
    id: 'overview-export-clones-the-selected-react-document',
    role: 'admin',
    async run({ page, origin }) {
      await page.addInitScript(() => {
        const open = window.open.bind(window);
        window.open = (...args) => {
          const popup = open(...args);
          if (popup) popup.print = () => { popup.document.documentElement.dataset.printRequested = 'true'; };
          return popup;
        };
      });
      await page.goto(origin + '/admin');
      await page.getByRole('button', { name: 'Exportar', exact: true }).click();
      const preview = page.locator('.overview-export-print');
      await preview.waitFor({ state: 'attached' });
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Abrir visualização do PDF' }).click();
      const popup = await popupPromise;
      await popup.locator('html[data-print-requested="true"]').waitFor({ state: 'attached' });
      assert.equal(await popup.title(), 'Panorama do Workspace');
      const paper = popup.locator('body > article.overview-export-print');
      assert.equal(await paper.textContent(), await preview.textContent());
      const size = await paper.evaluate((element) => parseFloat(getComputedStyle(element).width));
      assert.ok(Math.abs(size - 210 * 96 / 25.4) < 1);
      const readBrand = (element) => getComputedStyle(element).getPropertyValue('--cali-palette-burgundy-base-rgb').trim().split(/\s+/);
      const brand = await page.locator('html').evaluate(readBrand);
      assert.equal(brand.length, 3);
      assert.deepEqual(await popup.locator('html').evaluate(readBrand), brand);
      assert.equal(
        await paper.locator('.overview-export-document-head strong').evaluate((element) => getComputedStyle(element).color),
        `rgb(${brand.join(', ')})`,
        'A cor da marca deve estar disponível na janela independente de impressão',
      );
      await popup.close();
    },
  },
  {
    id: 'overview-admin-mobile-header',
    role: 'admin',
    width: 390,
    async run({ page, origin, snapshot }) {
      await page.goto(origin + '/admin');
      const heading = page.getByRole('heading', { name: /^Visão geral/, level: 1 });
      const intro = page.getByText('Onde estão as decisões, entregas e contas que precisam da CALI hoje.');
      const action = page.getByRole('link', { name: 'Cadastrar cliente', exact: true });
      await heading.waitFor();
      const [title, copy, button] = await Promise.all([heading.boundingBox(), intro.boundingBox(), action.boundingBox()]);
      assert.ok(title && copy && button);
      assert.ok(button.y - (copy.y + copy.height) <= 28, 'Ação separada do texto por espaço vazio');
      assert.ok(Math.abs(button.x - title.x) <= 2, 'Ação desalinhada do título');
      const filters = ['Conta', 'Mês das horas'].map((name) => page.getByRole('combobox', { name, exact: true }));
      const [company, period] = await Promise.all(filters.map((select) => select.boundingBox()));
      assert.ok(company && period);
      assert.ok(Math.abs(company.y - period.y) < 1, 'Os filtros cabem na mesma linha a 390 px.');
      assert.ok(company.x + company.width <= period.x);
      for (const select of filters) {
        const fits = await select.evaluate((element) => {
          const style = getComputedStyle(element);
          const context = document.createElement('canvas').getContext('2d');
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const width = context.measureText(element.selectedOptions[0].text).width;
          const innerWidth = element.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd);
          return width <= innerWidth + 1;
        });
        assert.ok(fits, 'O nome da conta e o mês precisam aparecer completos.');
      }
      await snapshot('cabecalho-mobile', page.locator('.ap-title'));
      await action.click();
      await page.waitForURL((url) => url.pathname === '/admin/clientes');
    },
  },
];

if (require.main === module) browserSuite(cases).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = cases;
