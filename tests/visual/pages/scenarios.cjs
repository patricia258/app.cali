'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { makeSession, fixtureCode, sessionKey } = require('../../e2e/browser-fixture.cjs');
const { projectId } = require('../../e2e/fixtures.cjs');

const navigation = {
  client: ['/cliente', '/cliente/cronograma', '/cliente/documentos'],
  admin: ['/admin', '/admin/clientes', '/admin/projetos'],
  partner: ['/equipe', '/equipe/projetos', '/equipe/documentos'],
};
const indicators = '/cliente/equipe?aba=indicadores&qa=1#referencia';
const directory = '/cliente/equipe?aba=diretorio&qa=%2Fpesquisa&tag=a&tag=b#diretorio';
const deliveries = '/cliente/entregaveis?deliverable=44444443-4444-4444-8444-444444444444';
const company = 'Empresa QA fictícia';

async function openMenu(page) {
  const toggle = page.locator('button.mobile-menu:visible').first();
  if (await toggle.count()) await toggle.click();
}

async function navigateMenu({ page, go, role, id }) {
  const [home, first, second] = navigation[role];
  const click = async (route) => {
    await openMenu(page);
    await page.locator(`.sidebar a[href="${route}"]:visible`).first().click();
    await page.waitForURL((url) => url.pathname === route);
  };
  await go(home);
  await click(first);
  if (id === 'menu:first') return;
  await click(second);
  if (!id.startsWith('history:')) return;
  await page.goBack();
  await page.waitForURL((url) => url.pathname === first);
  if (id === 'history:forward') {
    await page.goForward();
    await page.waitForURL((url) => url.pathname === second);
  }
}

async function showMfa({ page, go }) {
  await go('/login');
  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: sessionKey,
    session: makeSession('aal1'),
  });
  await go('/admin');
  await page.getByRole('heading', { name: 'Verificação em duas etapas' }).waitFor();
}

async function matrixState({ page, go, role, id }) {
  if (id.startsWith('/oauth/google/callback?code=')) {
    await go(id);
    await page.waitForURL((url) => url.pathname !== '/oauth/google/callback');
    return;
  }
  if (id.startsWith('/')) return go(id);
  if (id.startsWith('menu:') || id.startsWith('history:')) return navigateMenu({ page, go, role, id });
  if (id === 'reload:deep-link') {
    await go(navigation[role][2] + '?qa=rota%2Flegada&etapa=1&etapa=2#referencia');
    await page.reload({ waitUntil: 'domcontentloaded' });
    return;
  }
  if (id === 'mfa:verify') {
    await showMfa({ page, go });
    await page.getByLabel('Código do aplicativo').fill(fixtureCode);
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await page.locator('.ap-app').waitFor();
    return;
  }
  if (id === 'search:notice-close-replace') {
    const before = '/cliente?qa=anterior#home';
    await go(before);
    await go('/cliente/avisos?qa=%2Fpesquisa&tag=a&tag=b&aviso=qa-notice#comunicado');
    const dialog = page.getByRole('dialog', { name: 'Comunicado', exact: true });
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/cliente');
    await page.goForward();
    await page.waitForURL((url) => url.pathname === '/cliente/avisos');
    return;
  }
  if (id.startsWith('search:team-') || id === 'controls:team-period') {
    await go(indicators);
    await page.locator('.section-tabs button.current').filter({ hasText: 'Indicadores' }).waitFor();
    if (id.startsWith('search:team-history-')) {
      await go(directory);
      await page.goBack();
      await page.waitForURL((url) => url.searchParams.get('aba') === 'indicadores');
      if (id.endsWith('forward')) {
        await page.goForward();
        await page.waitForURL((url) => url.searchParams.get('aba') === 'diretorio');
      }
    }
    if (id === 'controls:team-period') {
      await page.locator('.v2-team-period-switch').getByRole('button', { name: 'Período', exact: true }).click();
      await page.getByLabel('De', { exact: true }).fill('2026-08');
      await page.getByLabel('Até', { exact: true }).fill('2026-09');
      await page.getByLabel('Período deste gráfico', { exact: true }).first().selectOption('3');
    }
    return;
  }
  throw new Error('Estado sem ação de captura: ' + id);
}

async function deliveryDialog({ page, go }, name) {
  await go(deliveries);
  const detail = page.getByRole('dialog', { name: 'Entrega QA C', exact: true });
  if (!(await detail.isVisible())) {
    const open = page.getByRole('button', { name: 'Abrir Entrega QA C', exact: true });
    if (!(await open.isVisible())) await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
    if (await open.isVisible()) await open.click();
  }
  const names =
    name === 'ajuste'
      ? ['Solicitar ajuste', 'O que precisa ser revisto?']
      : ['Aprovar entrega', 'Como foi esta entrega?'];
  await detail.getByRole('button', { name: names[0], exact: true }).click();
  await page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: names[1], exact: true }) })
    .waitFor();
}

const states = [
  [
    'public',
    'landing:carrossel-segunda-tela',
    async ({ page, go }) => {
      await go('/');
      const region = page.getByRole('region', { name: 'Telas do CALI Workspace na prática' });
      await region.getByRole('button', { name: 'Próxima tela', exact: true }).click();
      await region.getByRole('img', { name: 'Conversa com a Pati', exact: true }).waitFor();
    },
  ],
  [
    'public',
    'landing:menu-mobile',
    async ({ page, go }) => {
      await go('/');
      await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
      await page.getByRole('button', { name: 'Fechar menu', exact: true }).waitFor();
    },
    'mobile',
  ],
  [
    'public',
    'landing:ancora-workspace',
    async ({ page, go }) => {
      await go('/');
      await page.getByRole('link', { name: 'Ver o app por dentro' }).click();
      await page.waitForURL((url) => url.hash === '#workspace');
    },
  ],
  [
    'public',
    'login:email-preenchido',
    async ({ page, go }) => {
      await go('/login');
      await page.getByRole('textbox', { name: /e-mail/i }).fill('qa@example.invalid');
    },
  ],
  ['admin', 'seguranca:mfa-antes-da-confirmacao', showMfa],
  ['admin', 'legado:relatorios', ({ go }) => go('/admin/relatorios')],
  [
    'admin',
    'ocorrencias:recorte-vazio',
    async ({ page, go }) => {
      await go('/admin/registros');
      const type = page.getByRole('combobox', { name: 'Tipo', exact: true });
      await type.waitFor();
      const options = await type.locator('option').evaluateAll((items) => items.map((item) => item.value));
      const absent = options.find((value) => !['all', 'request', 'solicitacao', 'solicitação'].includes(value));
      assert(absent, 'Sem opção de filtro diferente do registro de teste');
      await type.selectOption(absent);
      await page.getByText('Nenhuma ocorrência neste recorte.', { exact: true }).waitFor();
    },
  ],
  [
    'client',
    'avisos:comunicado-aberto',
    async ({ page, go }) => {
      await go('/cliente/avisos?aviso=qa-notice');
      await page.getByRole('dialog', { name: 'Comunicado', exact: true }).waitFor();
    },
  ],
  [
    'client',
    'ocorrencias:conversa-aberta',
    async ({ page, go }) => {
      await go('/cliente/registros');
      await page.getByRole('button', { name: 'Abrir Solicitação QA fictícia', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Solicitação QA fictícia', exact: true });
      await dialog.getByText('Resposta QA da CALI.', { exact: true }).waitFor();
    },
  ],
  [
    'client',
    'ocorrencias:nova',
    async ({ page, go }) => {
      await go('/cliente/registros');
      await page.getByRole('button', { name: 'Nova ocorrência', exact: true }).click();
      await page.getByRole('textbox', { name: 'Assunto', exact: true }).waitFor();
    },
  ],
  ['client', 'entregaveis:ajuste', (scenario) => deliveryDialog(scenario, 'ajuste')],
  ['client', 'entregaveis:avaliacao', (scenario) => deliveryDialog(scenario, 'avaliacao')],
  [
    'client',
    'agenda:escolha-visita-extra',
    async ({ page, go }) => {
      await go('/cliente/cronograma');
      await page.getByRole('button', { name: 'Solicitar agendamento', exact: true }).click();
      await page.getByRole('dialog', { name: 'Que tipo de papo você deseja?' }).waitFor();
    },
  ],
  [
    'client',
    'agenda:painel-google',
    async ({ page, go }) => {
      await go('/cliente/cronograma');
      await page.locator('summary').filter({ hasText: 'Integração com Google Agenda' }).click();
      await page.getByRole('button', { name: 'Conectar Google Calendar', exact: true }).waitFor();
    },
  ],
  [
    'admin',
    'agenda:despesas-visita-extra',
    async ({ page, go }) => {
      await go('/admin/calendario');
      await page.getByRole('button', { name: 'Despesas das visitas extras', exact: true }).click();
      await page.getByRole('dialog', { name: 'Despesas de visitas extras' }).waitFor();
    },
  ],
  ...['client', 'admin', 'partner'].map((role) => [
    role,
    'menu:aberto-mobile',
    async ({ page, go }) => {
      await go(navigation[role][0]);
      await openMenu(page);
      await page.locator('.sidebar nav:visible').waitFor();
    },
    'mobile',
  ]),
  ...['Dados cadastrais', 'Contrato', 'Agenda do contrato', 'Frentes'].map((tab) => [
    'admin',
    'ficha:' + tab,
    async ({ page, go }) => {
      await go('/admin/clientes');
      await page.getByRole('button', { name: 'Editar ' + company, exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Gerenciar ' + company, exact: true });
      const control = sheet.getByRole('tab', { name: tab, exact: true });
      await control.click();
      await sheet.locator('.account-tab-pane:visible').first().waitFor();
      assert.equal(await control.getAttribute('aria-selected'), 'true');
    },
  ]),
  ...['Visão geral', 'Notas internas', 'Subtarefas', 'Arquivos', 'Histórico'].map((section) => [
    'admin',
    'entregavel:' + section,
    async ({ page, go }) => {
      await go(deliveries.replace('/cliente/entregaveis', '/admin/projetos') + '&project=' + projectId);
      const dialog = page.getByRole('dialog', { name: 'Entrega QA C', exact: true });
      const tab = section === 'Notas internas' ? 'Visão geral' : section;
      await dialog
        .getByRole('button', { name: tab === 'Subtarefas' ? /^Subtarefas \(/ : tab, exact: true })
        .click();
      if (section === 'Notas internas')
        await dialog.getByRole('heading', { name: 'Notas internas', exact: true }).scrollIntoViewIfNeeded();
    },
  ]),
  ...Object.entries({
    public: '/login',
    client: '/cliente/registros',
    admin: '/admin',
    partner: '/equipe',
    partnerLimited: '/equipe/horas',
  }).map(([role, path]) => [
    role,
    'tema:preferencia-noturna',
    async ({ page, go }) => {
      await go(path);
      await page.evaluate(() =>
        localStorage.setItem(
          'cali-workspace-theme-override-v1',
          JSON.stringify({ theme: 'night', until: 4070908800000 }),
        ),
      );
      await page.reload({ waitUntil: 'domcontentloaded' });
      const expected = role === 'public' ? 'night' : 'day';
      await page.waitForFunction((theme) => document.documentElement.dataset.workspaceTheme === theme, expected);
    },
  ]),
];

function scenarios() {
  const { cases } = JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, '../../e2e/routes.cjs'), '--list'], { encoding: 'utf8' }),
  );
  const matrix = Object.entries(cases).flatMap(([role, ids]) => ids.map((id) => ({ role, id, run: matrixState })));
  return [...matrix, ...states.map(([role, id, run, onlyViewport]) => ({ role, id, run, onlyViewport }))];
}

module.exports = { scenarios };
