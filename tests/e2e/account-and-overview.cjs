'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');

const supportAddress = 'mailto:patricia@calirh.com?subject=Acesso%20ao%20CALI%20Workspace';
const privacyAddress = 'mailto:privacidade@calirh.com';
const profileTrigger = (page) => page.locator('.profile[aria-haspopup="menu"]');

async function openAccount(page, origin, path) {
  await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
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
  { id: 'account-login-support', role: 'public', run: loginSupport },
  { id: 'account-client-privacy', role: 'client', run: clientAccount },
  { id: 'account-admin-links', role: 'admin', run: (ctx) => staffAccount(ctx, { path: '/admin', occurrences: '/admin/registros' }) },
  { id: 'account-partner-limited', role: 'partnerLimited', run: (ctx) => staffAccount(ctx, { path: '/equipe' }) },
  { id: 'overview-admin-pagination', role: 'admin', run: adminOverview },
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
      await snapshot('cabecalho-mobile', page.locator('.ap-title'));
      await action.click();
      await page.waitForURL((url) => url.pathname === '/admin/clientes');
    },
  },
];

if (require.main === module) browserSuite(cases).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = cases;
