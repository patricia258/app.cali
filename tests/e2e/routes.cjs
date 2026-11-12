'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { isDeepStrictEqual, parseArgs } = require('node:util');
const { setTimeout: pause } = require('node:timers/promises');
const { defaultChrome, serve, denyProxy, launchBrowser, closeBrowser, finishCli } = require('./loopback.cjs');
const {
  makeContext,
  makeSession,
  relative,
  part,
  factorId,
  fixtureCode,
  sessionKey,
} = require('./browser-fixture.cjs');

const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: path.resolve('dist') },
    output: { type: 'string' },
    chrome: { type: 'string', default: process.env.CALI_E2E_CHROME || defaultChrome() },
    list: { type: 'boolean', default: false },
    role: { type: 'string', multiple: true },
    case: { type: 'string', multiple: true },
  },
});
const roles = ['public', 'client', 'admin', 'partner', 'partnerLimited'];
const navigationIds = ['menu:first', 'menu:second', 'history:back', 'history:forward', 'reload:deep-link'];
const roleFilter = values.role?.flatMap((role) => role.split(',').map((value) => value.trim()));
const caseFilter = values.case?.flatMap((id) => id.split(',').map((value) => value.trim()));
for (const role of roleFilter || []) assert(roles.includes(role), 'Perfil desconhecido: ' + role);
const chosenRoles = roles.filter((role) => !roleFilter || roleFilter.includes(role));
const matches = (id) => !caseFilter || caseFilter.some((query) => id.includes(query));
const routeQuery = '?qa=rota%2Flegada&etapa=1&etapa=2#referencia';
const adminRoutes = [
  '/admin',
  '/admin/clientes',
  '/admin/equipe',
  '/admin/propostas',
  '/admin/propostas/qa-submission/editar',
  '/admin/propostas/proposta/qa-proposal',
  '/admin/projetos',
  '/admin/horas',
  '/admin/calendario',
  '/admin/registros',
  '/admin/documentos',
  '/admin/relatorios/impressao/qa-report',
  '/admin/relatorios',
  '/admin/auditoria',
  '/admin/equipe-cali',
  '/admin/avisos',
  '/admin/satisfacao',
  '/admin/mapa-de-people',
  '/admin/formularios',
  '/admin/perfil-comportamental',
  '/admin/perfil-comportamental/gestao/qa-link',
  '/admin/perfil-comportamental/convites/qa-link',
  '/admin/perfil-comportamental/qa-profile',
  '/admin/mapa-de-people/revisao',
  '/admin/mapa-de-people/relatorio/qa-map',
];
const clientRoutes = [
  '/cliente',
  '/cliente/cronograma',
  '/cliente/equipe',
  '/cliente/avisos',
  '/cliente/ajuda',
  '/cliente/frentes',
  '/cliente/entregaveis',
  '/cliente/horas',
  '/cliente/registros',
  '/cliente/documentos',
  '/cliente/relatorios/impressao/qa-report',
  '/cliente/relatorios',
  '/cliente/perfil-comportamental/gestao/qa-link',
  '/cliente/perfil-comportamental/qa-profile',
];
const partnerRoutes = [
  '/equipe',
  '/equipe/ocorrencias',
  '/equipe/calendario',
  '/equipe/horas',
  '/equipe/documentos',
  '/equipe/pessoas',
  '/equipe/relatorios',
  '/equipe/relatorios/impressao/qa-report',
  '/equipe/materiais',
  '/equipe/projetos',
  '/equipe/avisos',
  '/equipe/aprovacoes',
];
const publicRoutes = [
  '/',
  '/login',
  '/privacidade',
  '/termos',
  '/politica-do-site',
  '/f/qa-form',
  '/pre-cadastro/link-invalido',
  '/perfil/qa-disc',
  '/perfil/relatorio/qa-legacy',
  '/perfil/sair/qa-invite',
  '/oauth/google/callback',
];
const hrefs = {
  client: ['/cliente/cronograma', '/cliente/documentos'],
  admin: ['/admin/clientes', '/admin/projetos'],
  partner: ['/equipe/projetos', '/equipe/documentos'],
};
const homes = { client: '/cliente', admin: '/admin', partner: '/equipe', partnerLimited: '/equipe' };
const routePlans = {
  public: publicRoutes
    .map((url) => [url + routeQuery, url + routeQuery])
    .concat([
      ['/admin/clientes' + routeQuery, '/login'],
      ['/cliente/documentos' + routeQuery, '/login'],
      ['/equipe/horas' + routeQuery, '/login'],
      ['/auth/callback' + routeQuery, '/'],
      ['/rota-ausente' + routeQuery, '/'],
    ]),
  client: clientRoutes
    .map((url) => [url + routeQuery, url + routeQuery])
    .concat([
      ['/admin/clientes' + routeQuery, '/cliente'],
      ['/equipe/projetos' + routeQuery, '/cliente'],
      ['/cliente/equipe?aba=indicadores&qa=1#referencia', '/cliente/equipe?aba=indicadores&qa=1#referencia'],
      ['/cliente/relatorios?report=qa-report#referencia', '/cliente/relatorios?report=qa-report#referencia'],
      [
        '/cliente/entregaveis?deliverable=44444443-4444-4444-8444-444444444444&project=33333333-3333-4333-8333-333333333333#referencia',
        '/cliente/entregaveis?deliverable=44444443-4444-4444-8444-444444444444&project=33333333-3333-4333-8333-333333333333#referencia',
      ],
    ]),
  admin: adminRoutes
    .map((url) => [url + routeQuery, url + routeQuery])
    .concat([
      ['/cliente/horas' + routeQuery, '/admin'],
      ['/equipe/horas' + routeQuery, '/admin'],
    ]),
  partner: partnerRoutes
    .map((url) => [url + routeQuery, url + routeQuery])
    .concat([
      ['/cliente/horas' + routeQuery, '/equipe'],
      ['/admin/clientes' + routeQuery, '/equipe'],
      ['/equipe/rota-ausente' + routeQuery, '/equipe'],
    ]),
  partnerLimited: [
    ['/equipe/horas' + routeQuery, '/equipe/horas' + routeQuery],
    ['/equipe/documentos' + routeQuery, '/equipe'],
  ],
};
const callback = (purpose) =>
  '/oauth/google/callback?code=qa-code&state=' + part({ purpose }) + '.synthetic#referencia';
for (const role of ['client', 'admin', 'partner']) {
  routePlans[role].push(['/auth/callback?token_hash=qa-otp&type=magiclink', homes[role]]);
}
routePlans.client.push(
  [callback('drive'), '/cliente/documentos?drive=connected'],
  [callback('calendar'), '/cliente/cronograma?google=connected'],
);
routePlans.admin.push([callback('calendar'), '/admin/calendario?google=connected']);

async function waitRendered(page) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root');
      if (root?.querySelector('.workspace-fatal-fallback')) throw new Error('Fallback fatal do Workspace');
      if (!root || root.children.length === 0 || root.querySelector('.route-loading,.v2-mfa-wait')) return false;
      return Boolean(root.querySelector('h1,h2,main,.cali-profile-shell,.ap-content,.inline-notice'));
    },
    undefined,
    { timeout: 7000 },
  );
}

async function capture(page) {
  const signature = await page.evaluate(() => ({
    heading:
      [...document.querySelectorAll('#root h1')]
        .find((el) => el.offsetWidth > 0)
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() || null,
    menu: [...document.querySelectorAll('#root .sidebar a[href]')]
      .map((el) => el.getAttribute('href'))
      .filter((href) => href?.startsWith('/')),
  }));
  return { url: relative(page.url()), ...signature };
}

async function captureStable(page) {
  const deadline = Date.now() + 4000;
  let stableSince = Date.now();
  let previous;
  while (Date.now() < deadline) {
    const current = await capture(page);
    const loading = await page
      .locator(
        '#root .route-loading:visible, #root .v2-mfa-wait:visible, #root .data-loading:visible, #root .team-loading:visible',
      )
      .count();
    if (loading || !isDeepStrictEqual(previous, current)) stableSince = Date.now();
    else if (Date.now() - stableSince >= 150) return current;
    previous = current;
    await pause(35);
  }
  throw new Error('URL, título e menu não estabilizaram após o carregamento');
}

async function waitURL(page, expected) {
  await page.waitForURL((url) => relative(url.href) === expected, { timeout: 7000 });
  await waitRendered(page);
}

async function run(browser, dist, label) {
  const server = await serve(dist);
  const scenarios = [];
  const blocked = new Set();
  const mocked = new Set();
  try {
    for (const role of chosenRoles) {
      if (!caseIds(role).some(matches)) continue;
      console.error(JSON.stringify({ stage: label, role, progress: 'start-role' }));
      const actor = await makeContext(browser, server.origin, role);
      try {
        const page = await actor.context.newPage();
        const pageErrors = [];
        const assetFailures = [];
        const canceledAssets = new Set();
        page.on('pageerror', (error) => pageErrors.push(error.message.replaceAll(server.origin, 'ORIGIN')));
        page.on('console', (message) => {
          const line = message.text();
          if (message.type() === 'error' && line.startsWith('CALI Workspace · erro de renderização')) {
            pageErrors.push(line.split('\n')[0].replaceAll(server.origin, 'ORIGIN'));
          }
        });
        page.on('requestfailed', (request) => {
          if (request.url().startsWith(server.origin + '/assets/')) {
            const error = request.failure()?.errorText;
            if (error === 'net::ERR_ABORTED') canceledAssets.add(relative(request.url()));
            else assetFailures.push({ path: relative(request.url()), error });
          }
        });
        page.on('response', (response) => {
          if (response.status() >= 400 && response.url().startsWith(server.origin + '/assets/')) {
            assetFailures.push({ path: relative(response.url()), status: response.status() });
          }
        });
        async function attempt(id, expected, action) {
          if (!matches(id)) return;
          const start = Date.now();
          console.error(JSON.stringify({ stage: label, role, id, progress: 'start' }));
          pageErrors.length = 0;
          assetFailures.length = 0;
          canceledAssets.clear();
          let result;
          try {
            await action();
            await waitURL(page, expected);
            result = { status: 'pass', ...(await captureStable(page)) };
          } catch (error) {
            const observed = page.url().startsWith(server.origin) ? await capture(page).catch(() => ({})) : {};
            result = {
              status: 'fail',
              ...observed,
              failure: error.name + ': ' + error.message.split('\n')[0].replaceAll(server.origin, 'ORIGIN'),
            };
          }
          const canceledAssetChecks = await Promise.all(
            [...canceledAssets].map(async (asset) => {
              const response = await fetch(server.origin + asset, { method: 'HEAD' });
              if (response.status !== 200) assetFailures.push({ path: asset, status: response.status });
              return { path: asset, status: response.status };
            }),
          );
          const scenario = {
            role,
            id,
            expected,
            ...result,
            pageErrors: [...pageErrors],
            assetFailures: [...assetFailures],
            canceledAssetChecks,
            durationMs: Date.now() - start,
          };
          scenarios.push(scenario);
          console.error(JSON.stringify({ stage: label, progress: 'end', ...scenario }));
        }
        for (const [from, expected] of routePlans[role]) {
          await attempt(from, expected, async () => {
            const response = await page.goto(server.origin + from, { waitUntil: 'domcontentloaded' });
            assert.equal(response.status(), 200);
          });
        }
        if (role === 'admin') {
          await attempt('mfa:verify', '/admin', async () => {
            await page.goto(server.origin + '/login', { waitUntil: 'domcontentloaded' });
            await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
              key: sessionKey,
              session: makeSession('aal1'),
            });
            await page.goto(server.origin + '/admin', { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: 'Verificação em duas etapas' }).waitFor({ timeout: 7000 });
            assert.equal(await page.locator('.ap-app').count(), 0, 'Admin AAL1 renderizou dashboard');
            await page.getByLabel('Código do aplicativo').fill(fixtureCode);
            const [verified] = await Promise.all([
              page.waitForResponse(
                (response) => new URL(response.url()).pathname === '/auth/v1/factors/' + factorId + '/verify',
                { timeout: 7000 },
              ),
              page.getByRole('button', { name: 'Confirmar' }).click({ timeout: 7000 }),
            ]);
            assert.equal(verified.status(), 200);
            await page.locator('.ap-app').waitFor({ timeout: 7000 });
          });
        }
        if (role === 'client') {
          const closedNotice = '/cliente/avisos?qa=%2Fpesquisa&tag=a&tag=b#comunicado';
          const openNotice = closedNotice.replace('#', '&aviso=qa-notice#');
          await attempt('search:notice-close-replace', closedNotice, async () => {
            const before = '/cliente?qa=anterior#home';
            await page.goto(server.origin + before, { waitUntil: 'domcontentloaded' });
            await waitURL(page, before);
            await page.goto(server.origin + openNotice, { waitUntil: 'domcontentloaded' });
            const dialog = page.getByRole('dialog', { name: 'Comunicado', exact: true });
            await dialog.getByRole('button', { name: 'Fechar', exact: true }).click({ timeout: 7000 });
            await waitURL(page, closedNotice);
            await dialog.waitFor({ state: 'hidden', timeout: 7000 });
            await page.goBack();
            await waitURL(page, before);
            await page.goForward();
            await waitURL(page, closedNotice);
            await dialog.waitFor({ state: 'hidden', timeout: 7000 });
          });
          const indicators = '/cliente/equipe?aba=indicadores&qa=1#referencia';
          const directory = '/cliente/equipe?aba=diretorio&qa=%2Fpesquisa&tag=a&tag=b#diretorio';
          function activeTeamTab(label) {
            return page
              .locator('.section-tabs button.current')
              .filter({ hasText: label })
              .waitFor({ timeout: 7000 });
          }
          async function openTeam(url, label) {
            await page.goto(server.origin + url, { waitUntil: 'domcontentloaded' });
            await activeTeamTab(label);
          }
          await attempt('search:team-indicators', indicators, () => openTeam(indicators, 'Indicadores'));
          await attempt('search:team-history-back', indicators, async () => {
            await openTeam(indicators, 'Indicadores');
            await openTeam(directory, 'Diretório');
            await page.goBack();
            await waitURL(page, indicators);
            await activeTeamTab('Indicadores');
          });
          await attempt('search:team-history-forward', directory, async () => {
            await openTeam(indicators, 'Indicadores');
            await openTeam(directory, 'Diretório');
            await page.goBack();
            await waitURL(page, indicators);
            await page.goForward();
            await waitURL(page, directory);
            await activeTeamTab('Diretório');
          });
          await attempt('controls:team-period', indicators, async () => {
            await openTeam(indicators, 'Indicadores');
            const toggle = page
              .locator('.v2-team-period-switch')
              .getByRole('button', { name: 'Período', exact: true });
            await toggle.click({ timeout: 7000 });
            const from = page.getByLabel('De', { exact: true });
            const to = page.getByLabel('Até', { exact: true });
            await from.fill('2026-08', { timeout: 7000 });
            await to.fill('2026-09', { timeout: 7000 });
            assert.equal(await from.inputValue(), '2026-08');
            assert.equal(await to.inputValue(), '2026-09');
            assert.equal(await from.getAttribute('max'), '2026-09');
            assert.equal(await to.getAttribute('min'), '2026-08');
            const chart = page.getByLabel('Período deste gráfico', { exact: true });
            const chartPrimary = chart.first();
            const chartSecond = chart.nth(1);
            assert.equal(await chartPrimary.inputValue(), 'page');
            await chartPrimary.selectOption('3', { timeout: 7000 });
            assert.equal(await chartPrimary.inputValue(), '3');
            assert.equal(await chartSecond.inputValue(), 'page');
            assert.equal(await from.inputValue(), '2026-08');
            assert.equal(await to.inputValue(), '2026-09');
            await page
              .locator('.v2-team-period-switch')
              .getByRole('button', { name: 'Mês', exact: true })
              .click({ timeout: 7000 });
            assert.equal(await page.getByLabel('Mês de referência', { exact: true }).inputValue(), '2026-09');
          });
        }
        if (!hrefs[role]) continue;
        const [first, second] = hrefs[role];
        const home = homes[role];
        async function navigateMenu(destination) {
          await page
            .locator('.sidebar a[href="' + destination + '"]')
            .first()
            .click();
          await waitURL(page, destination);
        }
        async function startMenu() {
          await page.goto(server.origin + home, { waitUntil: 'domcontentloaded' });
          await waitURL(page, home);
          await navigateMenu(first);
        }
        await attempt('menu:first', first, startMenu);
        await attempt('menu:second', second, async () => {
          await startMenu();
          await navigateMenu(second);
        });
        await attempt('history:back', first, async () => {
          await startMenu();
          await navigateMenu(second);
          await page.goBack();
        });
        await attempt('history:forward', second, async () => {
          await startMenu();
          await navigateMenu(second);
          await page.goBack();
          await waitURL(page, first);
          await page.goForward();
        });
        await attempt('reload:deep-link', second + routeQuery, async () => {
          await page.goto(server.origin + second + routeQuery, { waitUntil: 'domcontentloaded' });
          await waitURL(page, second + routeQuery);
          await page.reload({ waitUntil: 'domcontentloaded' });
        });
      } finally {
        await actor.context.close();
        actor.blocked.forEach((value) => blocked.add(value));
        actor.mocked.forEach((value) => mocked.add(value));
      }
    }
  } finally {
    server.close();
  }
  return { dist, scenarios, blockedHosts: [...blocked].sort(), mockedPaths: [...mocked].sort() };
}

function caseIds(role) {
  return [
    ...routePlans[role].map(([id]) => id),
    ...(role === 'admin' ? ['mfa:verify'] : []),
    ...(role === 'client'
      ? [
          'search:notice-close-replace',
          'search:team-indicators',
          'search:team-history-back',
          'search:team-history-forward',
          'controls:team-period',
        ]
      : []),
    ...(hrefs[role] ? navigationIds : []),
  ];
}

async function main() {
  const cases = Object.fromEntries(chosenRoles.map((role) => [role, caseIds(role).filter(matches)]));
  const total = Object.values(cases).reduce((count, ids) => count + ids.length, 0);
  assert(total > 0, 'Nenhum cenário selecionado');
  if (values.list) {
    console.log(JSON.stringify({ total, cases }, null, 2));
    return;
  }
  assert(values.output, '--output obrigatório');
  const proxy = await denyProxy();
  let browser;
  try {
    browser = await launchBrowser(values.chrome, proxy);
    const result = await run(browser, values.dist, 'routes');
    const failures = result.scenarios.filter(
      (item) => item.status === 'fail' || item.pageErrors.length || item.assetFailures.length,
    );
    const summary = {
      passes: result.scenarios.length - failures.length,
      total: result.scenarios.length,
      failures,
    };
    await fs.writeFile(values.output, JSON.stringify({ ...result, ...summary }, null, 2) + '\n');
    console.log(JSON.stringify({ ...summary, output: values.output }));
    if (failures.length || result.scenarios.length !== total) process.exitCode = 1;
  } finally {
    proxy.close();
    await closeBrowser(browser);
  }
}

finishCli(main);
