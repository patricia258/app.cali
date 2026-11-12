import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import loopback from '../e2e/loopback.cjs';
import { registerCalendarNavigation, supabaseOrigin } from './calendar-navigation.mjs';

const { serve, denyProxy, defaultChrome, launchBrowser, closeBrowser } = loopback;
const root = fileURLToPath(new URL('.', import.meta.url));
let outDir;
let server;
let proxy;
let browser;

before(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'cali-ds-'));
  await build({
    root,
    configFile: false,
    envDir: false,
    envPrefix: 'CALI_DS_FIXTURE_',
    logLevel: 'error',
    esbuild: { jsx: 'automatic' },
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseOrigin),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_qa_fixture'),
    },
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.id?.includes('/node_modules/')) return;
          warn(warning);
        },
      },
    },
  });
  server = await serve(outDir);
  proxy = await denyProxy();
  browser = await launchBrowser(process.env.CALI_E2E_CHROME || defaultChrome(), proxy);
});

after(async () => {
  server?.close();
  proxy?.close();
  try {
    await closeBrowser(browser);
  } finally {
    if (outDir) await rm(outDir, { recursive: true, force: true });
  }
});

function component(name, fixture, check, expectedError, setup) {
  test(name, async (t) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    t.after(() => context.close());
    await context.route(
      (url) => url.origin !== server.origin,
      (route) => route.abort('blockedbyclient'),
    );
    await context.routeWebSocket('**/*', (socket) => socket.close());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(2500);
    const state = await setup?.(context, page, server.origin);
    await page.goto(server.origin + '/?fixture=' + encodeURIComponent(fixture), { waitUntil: 'domcontentloaded' });
    await check(page, state);
    assert.deepEqual(
      errors.filter((message) => !expectedError?.test(message)),
      [],
    );
  });
}

registerCalendarNavigation((name, fixture, check, setup) => component(name, fixture, check, undefined, setup));

const focused = (locator) => locator.evaluate((element) => element === document.activeElement);

component(
  'DialogFrame · Escape fecha botão DS com nome acessível personalizado e devolve foco',
  'frame',
  async (page) => {
    const trigger = page.getByRole('button', { name: 'Abrir confirmação' });
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Confirmação' });
    await dialog.getByRole('button', { name: 'Fechar confirmação' }).waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert(await focused(trigger));
  },
);

component('DialogFrame · mantém autoFocus no campo e devolve foco ao gatilho', 'frameAutofocus', async (page) => {
  const trigger = page.getByRole('button', { name: 'Abrir confirmação' });
  await trigger.press('Enter');
  const field = page.getByRole('textbox', { name: 'Motivo' });
  assert(await focused(field));
  await page.keyboard.press('Escape');
  await field.waitFor({ state: 'detached' });
  assert(await focused(trigger));
});

component(
  'Button · submissão nativa, pending bloqueia repetição e estado libera o próximo envio',
  'controls',
  async (page) => {
    const email = page.getByRole('textbox', { name: 'E-mail' });
    const submit = page.getByRole('button', { name: 'Enviar', exact: true });
    await submit.click();
    assert.equal(await page.getByRole('status', { name: 'Envios' }).textContent(), '0');
    assert(await focused(email));
    await email.fill('qa@example.invalid');
    await page.getByRole('combobox', { name: 'Situação' }).selectOption('open');
    await page.getByRole('textbox', { name: 'Observações' }).fill('Revisar orçamento');
    await submit.click();
    const pending = page.getByRole('button', { name: 'Enviando…' });
    assert(await pending.isDisabled());
    assert.equal(await pending.getAttribute('aria-busy'), 'true');
    assert.match(await pending.getAttribute('class'), /\bwf-primary\b.*\bfixture-submit\b/);
    assert.equal(
      await page.getByRole('status', { name: 'Dados enviados' }).textContent(),
      'qa@example.invalid · open · Revisar orçamento',
    );
    await email.press('Enter');
    assert.equal(await page.getByRole('status', { name: 'Envios' }).textContent(), '1');
    await page.getByRole('button', { name: 'Concluir envio' }).click();
    assert(await submit.isEnabled());
    await submit.press('Enter');
    assert.equal(await page.getByRole('status', { name: 'Envios' }).textContent(), '2');
  },
);

component('Button · nomes acessíveis, disabled explícito e aria-busy do consumidor', 'controls', async (page) => {
  await page.getByRole('button', { name: 'Fechar', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fechar prévia', exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Indisponível' }).isDisabled());
  assert.equal(await page.getByRole('button', { name: 'Preparar' }).getAttribute('aria-busy'), 'true');
});

component(
  'FieldLabel, FilterSelect, GuidedInput e GuidedTextarea · associação, interação e refs nativas',
  'controls',
  async (page) => {
    const email = page.getByRole('textbox', { name: 'E-mail' });
    await page.locator('label.fixture-label').click();
    assert(await focused(email));
    assert.equal(await email.getAttribute('autocomplete'), 'email');
    assert.match(await email.getAttribute('class'), /\bcf-text\b.*\bfixture-input\b/);
    const select = page.getByRole('combobox', { name: 'Situação' });
    assert.equal(await select.inputValue(), 'all');
    await select.selectOption('open');
    assert.equal(await select.inputValue(), 'open');
    assert.match(await select.getAttribute('class'), /\bwf-record-filter\b.*\bfixture-select\b/);
    const textarea = page.getByRole('textbox', { name: 'Observações' });
    await page.getByRole('button', { name: 'Conferir refs' }).click();
    assert.equal(await page.getByRole('status', { name: 'Referências' }).textContent(), 'Refs nativas');
    assert(await focused(textarea));
    await textarea.pressSequentially('a'.repeat(34));
    assert.equal(await textarea.inputValue(), 'a'.repeat(32));
    assert.equal(await textarea.getAttribute('rows'), '3');
    assert.match(await textarea.getAttribute('class'), /\bcf-text\b.*\bcf-long\b/);
  },
);

component('DataTable e StatusBadge · nome, cabeçalhos, células e estados legíveis', 'tables', async (page) => {
  const team = page.getByRole('table', { name: 'Equipe' });
  await team.getByRole('columnheader', { name: 'Pessoa' }).waitFor();
  await team.getByRole('rowheader', { name: 'Pessoa QA' }).waitFor();
  const active = team.getByRole('cell', { name: 'Ativa' });
  assert.match(await active.locator('span').getAttribute('class'), /\bstatus-chip\b/);
  assert.match(await team.getAttribute('class'), /\bteam-report-table\b.*\bfixture-table\b/);
  const analytics = page.getByRole('table', { name: 'Entregas' });
  await analytics.getByRole('cell', { name: 'Planejamento' }).waitFor();
  assert.match(await analytics.getAttribute('class'), /\bpa-table\b/);
  assert.match(
    await analytics.getByRole('cell', { name: 'Em revisão' }).locator('b').getAttribute('class'),
    /\bdv-status\b.*\bfixture-status\b/,
  );
});

component(
  'LoadingState e EmptyState · anúncio ocupado, transição e semântica do vazio',
  'states',
  async (page) => {
    const loading = page.getByRole('status').filter({ hasText: 'Carregando registros' });
    assert.equal(await loading.getAttribute('aria-busy'), 'true');
    assert.match(await loading.getAttribute('class'), /\bdata-loading\b.*\bfixture-loading\b/);
    assert.equal(await page.getByRole('log').getAttribute('aria-busy'), 'false');
    await page.getByRole('button', { name: 'Concluir leitura' }).click();
    await loading.waitFor({ state: 'detached' });
    const empty = page.getByText('Nenhum resultado', { exact: true });
    assert.equal(await empty.evaluate((element) => element.tagName), 'P');
    assert.match(await empty.getAttribute('class'), /\bwf-empty\b.*\bfixture-empty\b/);
    assert.match(
      await page.getByRole('region', { name: 'Fila da administração' }).getAttribute('class'),
      /\bv2-admin-empty\b/,
    );
  },
);

component(
  'InlineNotice · status de sucesso, alerta de erro e prioridade do role explícito',
  'states',
  async (page) => {
    const saved = page.getByRole('status').filter({ hasText: /^Salvo$/ });
    assert.match(await saved.getAttribute('class'), /\binline-notice success fixture-notice\b/);
    const error = page.getByRole('alert').filter({ hasText: /^Falhou$/ });
    assert.equal(await error.evaluate((element) => element.tagName), 'P');
    assert.match(await error.getAttribute('class'), /\binline-notice danger\b/);
    const handled = page.getByRole('status').filter({ hasText: 'Falha já tratada' });
    await handled.waitFor();
    assert.equal(await page.getByText('Informação', { exact: true }).getAttribute('role'), null);
  },
);

component(
  'WorkspaceRouteLoader · região ocupada, mensagem acessível e ilustração decorativa',
  'loader',
  async (page) => {
    const main = page.getByRole('main');
    assert.equal(await main.getAttribute('aria-live'), 'polite');
    assert.equal(await main.getAttribute('aria-busy'), 'true');
    assert.match(await main.ariaSnapshot(), /Carregando seu Workspace/);
    assert.equal(await main.locator('[aria-hidden="true"] .cali-loading-mark').count(), 2);
    await page.getByRole('button', { name: 'Resolver rota' }).click();
    await main.getByRole('heading', { name: 'Registros' }).waitFor();
    assert.equal(await main.getAttribute('aria-busy'), null);
    assert.doesNotMatch(await main.ariaSnapshot(), /Carregando seu Workspace/);
  },
);

component(
  'DialogFrame · Tab e Shift+Tab respeitam o diálogo, e preventDefault preserva a ação do consumidor',
  'keyboard',
  async (page) => {
    const trigger = page.getByRole('button', { name: 'Abrir revisão' });
    await trigger.press('Enter');
    const dialog = page.getByRole('alertdialog', { name: 'Revisão' });
    assert.equal(await dialog.evaluate((element) => element.tagName), 'ASIDE');
    assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    assert(await focused(dialog));
    const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
    const input = dialog.getByRole('textbox', { name: 'Observação' });
    await page.keyboard.press('Tab');
    assert(await focused(close));
    await page.keyboard.press('Shift+Tab');
    assert(await focused(input));
    await page.keyboard.press('Tab');
    assert(await focused(close));
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('status', { name: 'Escapes interceptados' }).textContent(), '1');
    await dialog.waitFor();
    await close.click();
    await dialog.waitFor({ state: 'detached' });
    assert(await focused(trigger));
  },
);

component('DialogFrame · Escape fecha somente o nível ativo e ignora botão invisível', 'nested', async (page) => {
  const trigger = page.getByRole('button', { name: 'Abrir detalhes' });
  await trigger.press('Enter');
  const outer = page.getByRole('dialog', { name: 'Detalhes' });
  const innerTrigger = outer.getByRole('button', { name: 'Abrir confirmação' });
  await innerTrigger.press('Enter');
  const inner = page.getByRole('dialog', { name: 'Confirmação' });
  await inner.waitFor();
  assert(await focused(inner));
  await page.keyboard.press('Escape');
  await inner.waitFor({ state: 'detached' });
  await outer.waitFor();
  assert(await focused(innerTrigger));
  await page.keyboard.press('Escape');
  await outer.waitFor({ state: 'detached' });
  assert(await focused(trigger));
});

component('DialogForm · Enter valida e envia formulário nativo com retorno de foco', 'form', async (page) => {
  const trigger = page.getByRole('button', { name: 'Abrir cadastro' });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Cadastro' });
  const field = dialog.getByRole('textbox', { name: 'Nome' });
  assert(await focused(field));
  await field.press('Enter');
  await dialog.waitFor();
  assert.equal(await page.getByRole('status', { name: 'Nome salvo' }).textContent(), '');
  await field.fill('Pessoa QA');
  await field.press('Enter');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('status', { name: 'Nome salvo' }).textContent(), 'Pessoa QA');
  assert(await focused(trigger));
});

component('useDialogFocus · sem ações disponíveis, teclado mantém foco na região', 'hook', async (page) => {
  const dialog = page.getByRole('dialog', { name: 'Diálogo sem ações' });
  await dialog.waitFor();
  assert(await focused(dialog));
  await page.keyboard.press('Tab');
  assert(await focused(dialog));
  await page.keyboard.press('Shift+Tab');
  assert(await focused(dialog));
  await page.keyboard.press('Escape');
  await dialog.waitFor();
  assert(await focused(dialog));
});

component(
  'AppErrorBoundary · fallback acessível permite recuperação manual',
  'error',
  async (page) => {
    await page.getByRole('heading', { name: 'Workspace pronto' }).waitFor();
    await page.getByRole('button', { name: 'Simular falha' }).click();
    const alert = page.getByRole('alert');
    await alert.getByRole('heading', { name: 'O Workspace foi atualizado.' }).waitFor();
    await Promise.all([
      page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame() }),
      alert.getByRole('button', { name: 'Recarregar Workspace' }).click(),
    ]);
    await page.getByRole('heading', { name: 'Workspace pronto' }).waitFor();
  },
  /Fixture falhou na renderização/,
);

component(
  'AppErrorBoundary · módulo desatualizado recarrega uma vez e apresenta fallback no segundo erro',
  'stale',
  async (page) => {
    const frames = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) frames.push(frame.url());
    });
    await Promise.all([
      page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame() }),
      page.getByRole('button', { name: 'Simular falha' }).click(),
    ]);
    await page.getByRole('alert').getByRole('button', { name: 'Recarregar Workspace' }).waitFor();
    assert.equal(frames.length, 1);
    assert(await page.evaluate(() => Number(sessionStorage.getItem('cali:auto-reload-at')) > 0));
  },
  /ChunkLoadError: fixture desatualizada/,
);

component(
  'TimerFinalizationDialog · exige duas confirmações e bloqueia cancelamento durante processamento',
  'timer',
  async (page) => {
    const trigger = page.getByRole('button', { name: 'Finalizar execução' });
    await trigger.press('Enter');
    const first = page.getByRole('dialog', { name: 'Finalizar este entregável?' });
    await first.getByText('Planejamento QA').waitFor();
    assert.equal(await page.getByRole('status', { name: 'Finalizações' }).textContent(), '0');
    await first.getByRole('button', { name: 'Continuar' }).click();
    const second = page.getByRole('dialog', { name: 'Tem certeza mesmo?' });
    await second.getByText(/O cliente ainda não aprovou/).waitFor();
    assert.equal(await page.getByRole('status', { name: 'Finalizações' }).textContent(), '0');
    await second.getByRole('button', { name: 'Voltar' }).click();
    await second.waitFor({ state: 'detached' });
    assert(await focused(trigger));
    await trigger.press('Enter');
    await first.getByRole('button', { name: 'Continuar' }).click();
    await second.getByRole('button', { name: 'Sim, finalizar definitivamente' }).click();
    assert.equal(await page.getByRole('status', { name: 'Finalizações' }).textContent(), '1');
    assert(await second.getByRole('button', { name: 'Finalizando…' }).isDisabled());
    assert(await second.getByRole('button', { name: 'Fechar' }).isDisabled());
    await second.focus();
    await page.keyboard.press('Escape');
    await second.waitFor();
    await page.getByRole('button', { name: 'Concluir processamento' }).click();
    await second.waitFor({ state: 'detached' });
  },
);

component(
  'WelcomeTour · avanço, retorno, destaque e conclusão persistida com reabertura',
  'welcome',
  async (page) => {
    const dialog = page.getByRole('dialog', { name: 'Apresentação do CALI Workspace' });
    const team = page.getByRole('link', { name: 'Equipe' });
    await dialog.getByRole('heading', { name: 'Bem-vinda' }).waitFor();
    await dialog.getByRole('img', { name: 'Vídeo de boas-vindas (em breve)' }).waitFor();
    await dialog.getByRole('button', { name: 'Conhecer o Workspace' }).click();
    await dialog.getByRole('heading', { name: 'Quem está na equipe' }).waitFor();
    assert.match(await team.getAttribute('class'), /\bv2-tour-focus\b/);
    await dialog.getByRole('button', { name: 'Voltar' }).click();
    await dialog.getByRole('heading', { name: 'Bem-vinda' }).waitFor();
    assert.doesNotMatch((await team.getAttribute('class')) || '', /\bv2-tour-focus\b/);
    await dialog.getByRole('button', { name: 'Conhecer o Workspace' }).click();
    await dialog.getByRole('button', { name: 'Avançar' }).click();
    await dialog.getByRole('heading', { name: 'Tudo pronto' }).waitFor();
    await dialog.getByRole('button', { name: 'Começar' }).click();
    await dialog.waitFor({ state: 'detached' });
    assert(await page.evaluate(() => Boolean(localStorage.getItem('cali:welcome-seen:qa-tour'))));
    await page.reload();
    await page.getByRole('link', { name: 'Equipe' }).waitFor();
    assert.equal(await dialog.count(), 0);
    await page.getByRole('button', { name: 'Rever apresentação' }).click();
    await dialog.getByRole('heading', { name: 'Bem-vinda' }).waitFor();
  },
  undefined,
  async (context, _page, origin) => {
    await context.route(`${supabaseOrigin}/rest/v1/welcome_views?**`, (route) =>
      route.fulfill({
        headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*' },
        json: [],
      }),
    );
  },
);
