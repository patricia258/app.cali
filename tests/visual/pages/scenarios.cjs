'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { makeSession, fixtureCode, sessionKey } = require('../../e2e/browser-fixture.cjs');
const { projectId, tables } = require('../../e2e/fixtures.cjs');
const { fixtureOrigin } = require('./build.cjs');

const menuPaths = {
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
  const [home, first, second] = menuPaths[role];
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
    await go(menuPaths[role][2] + '?qa=rota%2Flegada&etapa=1&etapa=2#referencia');
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
      await page.locator('[aria-label="Filtrar por mês ou período"], .v2-team-period-switch').getByRole('button', { name: 'Período', exact: true }).click();
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

const proposalId = 'qa-visual-proposal';
const mapaProtocol = 'CALI-MAPA-QA';
const fixtureDate = '2026-11-12T12:00:00Z';
const proposal = {
  id: proposalId,
  submission_id: 'qa-submission',
  service_slug: 'assessoria-estrategica',
  version: 2,
  status: 'aprovada',
  pdf_path: null,
  package_code: 'cali-partner',
  final_unit: 5000,
  contract_months: 8,
  validity_days: 15,
  calculator_data: { monthlyHours: 12, contextSummary: 'Planejar o próximo ciclo e organizar os indicadores do time.' },
  scope_items: ['Análise de prioridades'],
  created_at: fixtureDate,
  updated_at: fixtureDate,
  submission: {
    id: 'qa-submission',
    protocol: 'CALI-PROP-QA',
    contact_name: 'Decisora QA',
    contact_email: 'decisor@example.invalid',
    company_name: company,
  },
};
const mapaRecord = {
  id: 'qa-map',
  protocolo: mapaProtocol,
  status: 'revisado',
  created_at: fixtureDate,
  c_nome: 'Decisora QA',
  c_cargo: 'Diretoria',
  c_empresa: company,
  c_email: 'decisor@example.invalid',
  c_whatsapp: '41900000000',
  d1_rh_hoje: 3, d1_processos: 4, d1_cargos_salarios: 2,
  d2_valores: 3, d2_lideres_preparo: 3, d2_comportamento_dono: 4, d2_sucessao: 2,
  d3_indicadores: 3, d3_decisao: 4, d3_custo: 3,
  d4_colaboradores: 4, d4_unidades: 2, d4_turnover: 3,
  observacoes: { parecer: 'Começar pelo diagnóstico executivo com o time.' },
};

function fulfillDocumentFixture(route, method, row) {
  const request = route.request();
  const headers = {
    'access-control-allow-origin': request.headers().origin || '*',
    'access-control-allow-methods': method,
    'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
  };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (request.method() !== method) return route.fallback();
  return route.fulfill({ headers, json: [row] });
}

async function previewProposal({ page, go }) {
  await page.route(
    (url) => url.pathname === '/rest/v1/cali_proposals' && url.searchParams.get('id') === 'eq.' + proposalId,
    (route) => fulfillDocumentFixture(route, 'GET', proposal),
  );
  await page.route('https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-*.png', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="34"><rect width="90" height="34" fill="#b58c52"/></svg>',
    }),
  );
  await go('/admin/propostas/proposta/' + proposalId);
  await page.getByRole('heading', { name: 'Olá, Decisora.', exact: true }).waitFor();
}

async function reviewMapa({ page, go }) {
  await page.route(
    (url) => url.origin === fixtureOrigin && url.pathname === '/rest/v1/rpc/workspace_mapa_people_record',
    (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.postDataJSON()?.p_protocolo !== mapaProtocol) return route.fallback();
      return fulfillDocumentFixture(route, 'POST', mapaRecord);
    },
  );
  await go('/admin/mapa-de-people/revisao?protocolo=' + mapaProtocol);
  await page.getByRole('heading', { name: company, exact: true }).waitFor();
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
  ['admin', 'propostas:previa-editorial', previewProposal],
  ['admin', 'propostas:drawer-envio', async (scenario) => {
    await previewProposal(scenario);
    await scenario.page.getByRole('button', { name: 'Enviar por e-mail', exact: true }).click();
    await scenario.page.locator('.portal-send-drawer').getByRole('heading', { name: 'Enviar proposta', exact: true }).waitFor();
  }],
  ['admin', 'mapa:revisao-com-dados', reviewMapa],
  [
    'public',
    'landing:como-funciona',
    async ({ page, go }) => {
      await go('/#como-funciona');
      const steps = page.locator('#como-funciona');
      await steps.scrollIntoViewIfNeeded();
      await steps.getByRole('heading').first().waitFor();
    },
  ],
  [
    'admin',
    'projetos:carteira-vazia',
    async ({ page, go }) => {
      await page.route((url) => url.origin === fixtureOrigin && url.pathname === '/rest/v1/projects', (route) => {
        const request = route.request();
        if (request.method() !== 'HEAD' && request.method() !== 'GET') return route.fallback();
        const headers = {
          'access-control-allow-origin': request.headers().origin || '*',
          'access-control-expose-headers': 'content-range',
          'content-range': '*/0',
        };
        if (request.method() === 'HEAD') return route.fulfill({ status: 200, headers });
        return route.fulfill({ headers, json: [] });
      });
      await go('/admin/projetos');
      await page.getByRole('heading', { name: /Ainda não há um projeto persistido|Nenhum projeto cadastrado/ }).waitFor();
    },
  ],
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
  [
    'client',
    'ocorrencias:solicitar-acesso',
    async ({ page, go }) => {
      await go('/cliente/registros');
      await page.getByRole('button', { name: 'Solicitar acesso', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Solicitar acesso adicional' });
      await dialog.getByRole('textbox', { name: 'Nome completo' }).fill('Pessoa indicada QA');
      await dialog.getByRole('textbox', { name: 'E-mail' }).fill('pessoa.qa@example.invalid');
      await dialog.getByRole('checkbox', { name: 'Li e estou ciente das condições acima.' }).check();
      await dialog.getByRole('button', { name: 'Enviar solicitação' }).waitFor();
    },
  ],
  ['client', 'entregaveis:ajuste', (scenario) => deliveryDialog(scenario, 'ajuste')],
  ['client', 'entregaveis:avaliacao', (scenario) => deliveryDialog(scenario, 'avaliacao')],
  ...['revisao', 'pedir-ajuste', 'confirmar'].map((state) => [
    'client',
    'subtarefa:' + state,
    async ({ page, go }) => {
      const task = tables.deliverable_tasks.find(({ id }) => id === 'qa-t2');
      const thread = [{
        id: 'qa-task-thread',
        author_role: 'admin',
        body: 'O documento atualizado está disponível. [[arquivo|Documento%20de%20QA.pdf|qa%2Fdocumento.pdf|application%2Fpdf|2048]]',
        created_at: '2026-11-12T16:00:00Z',
      }];
      await page.route((url) => url.origin === fixtureOrigin && ['/rest/v1/deliverable_tasks', '/rest/v1/task_messages'].includes(url.pathname), (route) => {
        const url = new URL(route.request().url());
        const headers = { 'access-control-allow-origin': new URL(page.url()).origin };
        if (url.pathname.endsWith('/task_messages')) return route.fulfill({ json: thread, headers });
        const waiting = { ...task, status: 'client_review', adjustment_count: 1 };
        const json = url.searchParams.get('id') ? [waiting] : tables.deliverable_tasks.map((row) => row.id === task.id ? waiting : row);
        return route.fulfill({ json, headers });
      });
      await go('/cliente/entregaveis?project=' + projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      await page.getByRole('button', { name: /Validação do cliente QA/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Subtarefa Validação do cliente QA' });
      await dialog.getByText('O documento atualizado está disponível.', { exact: true }).waitFor();
      if (state === 'pedir-ajuste') {
        await dialog.getByRole('button', { name: 'Pedir ajuste', exact: true }).click();
        await dialog.getByRole('textbox', { name: 'O que precisa ser ajustado nesta parte?' }).fill('Atualizar a data no documento de QA.');
      } else if (state === 'confirmar') {
        await dialog.getByRole('button', { name: 'Aprovar esta parte', exact: true }).click();
        await dialog.getByRole('button', { name: 'Sim, aprovar', exact: true }).waitFor();
      }
    },
  ]),
  ...['admin', 'client'].map((role) => [
    role,
    'entregaveis:conversa',
    async ({ page, go }) => {
      const id = tables.comments[0].target_id;
      const path = role === 'admin' ? '/admin/projetos' : '/cliente/entregaveis';
      await go(`${path}?project=${projectId}&deliverable=${id}`);
      const dialog = page.getByRole('dialog', { name: 'Entrega QA C', exact: true });
      await dialog.getByRole('button', { name: /^Conversas/ }).click();
      await dialog.getByText(tables.comments[0].body, { exact: true }).waitFor();
    },
  ]),
  [
    'admin',
    'projetos:kanban',
    async ({ page, go }) => {
      await go('/admin/projetos?project=' + projectId);
      await page.getByRole('tab', { name: 'Entregáveis', exact: true }).click();
      await page.getByRole('button', { name: 'Kanban', exact: true }).click();
      await page.locator('[data-project-kanban], .kanban-v2').getByRole('button', { name: /Entrega QA C/ }).waitFor();
    },
  ],
  ...['admin', 'partner'].map((role) => [
    role,
    'projetos:prazos',
    async ({ page, go }) => {
      await go((role === 'admin' ? '/admin/projetos' : '/equipe/projetos') + '?project=' + projectId);
      await page.getByRole('heading', { name: 'Prazos das entregas' }).waitFor();
      await page.getByRole('button', { name: /Entrega QA C/ }).waitFor();
    },
  ]),
  [
    'client',
    'projetos:cronograma-em-aprovacao',
    async ({ page, go }) => {
      const project = { ...tables.projects[0], planning_status: 'client_review', roadmap_end_date: '2027-02-01' };
      const review = { id: 'qa-schedule-review', project_id: projectId, status: 'pending', request_number: 1, requested_at: '2026-11-12T16:00:00Z' };
      await page.route((url) => url.origin === fixtureOrigin && ['/rest/v1/projects', '/rest/v1/project_review_requests'].includes(url.pathname), (route) => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        const headers = { 'access-control-allow-origin': request.headers().origin || '*' };
        if (new URL(request.url()).pathname.endsWith('/project_review_requests')) return route.fulfill({ headers, json: [review] });
        const single = request.headers().accept?.includes('vnd.pgrst.object');
        return route.fulfill({ headers, json: single ? project : [project] });
      });
      await go('/cliente/entregaveis?project=' + projectId);
      await page.getByRole('button', { name: 'Aprovar cronograma', exact: true }).waitFor();
    },
  ],
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
      await go(menuPaths[role][0]);
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
