import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import loopback from '../e2e/loopback.cjs';
import { registerCalendarNavigation, supabaseOrigin } from './calendar-navigation.mjs';
import { registerDeliveryDependencies } from './delivery-dependencies.mjs';

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
    publicDir: fileURLToPath(new URL('../../public', import.meta.url)),
    configFile: false,
    envDir: false,
    envPrefix: 'CALI_DS_FIXTURE_',
    logLevel: 'error',
    esbuild: { jsx: 'automatic' },
    plugins: [tailwindcss()],
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
      (route) => {
        if (new URL(route.request().url()).origin === 'https://fonts.googleapis.com'
          && route.request().resourceType() === 'stylesheet') {
          return route.fulfill({ status: 200, contentType: 'text/css', body: '/* Fontes externas desativadas */' });
        }
        return route.abort('blockedbyclient');
      },
    );
    await context.routeWebSocket('**/*', (socket) => socket.close());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(2500);
    const state = await setup?.(context, page, server.origin);
    await page.goto(server.origin + '/?fixture=' + encodeURIComponent(fixture), { waitUntil: 'domcontentloaded' });
    try {
      await check(page, state);
    } catch (error) {
      if (errors.length) throw new Error(errors.join('\n'), { cause: error });
      throw error;
    }
    assert.deepEqual(
      errors.filter((message) => !expectedError?.test(message)),
      [],
    );
  });
}

registerCalendarNavigation((name, fixture, check, setup) => component(name, fixture, check, undefined, setup));
registerDeliveryDependencies((name, fixture, check, setup) => component(name, fixture, check, undefined, setup));

const focused = (locator) => locator.evaluate((element) => element === document.activeElement);

component('Mídia privada · coalescência e descarte de resposta de sessão encerrada', 'workspaceMedia', async (page, state) => {
  try {
    const firstRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === state.pathname);
    await page.getByRole('button', { name: 'Abrir sessão anterior', exact: true }).click();
    await firstRequest;
    await page.getByRole('button', { name: 'Trocar sessão', exact: true }).click();
    const next = page.getByRole('status', { name: 'nova', exact: true });
    await next.waitFor();
    const urls = JSON.parse(await next.textContent());
    assert.equal(urls.length, 2);
    assert.equal(urls[0], urls[1]);
    assert.match(urls[0], /token=segunda/);
    await page.getByRole('button', { name: 'Consultar novamente', exact: true }).click();
    const cached = page.getByRole('status', { name: 'cache', exact: true });
    await cached.waitFor();
    assert.deepEqual(JSON.parse(await cached.textContent()), urls);
  } finally {
    state.releaseFirstRequest();
  }
  const previous = page.getByRole('status', { name: 'anterior', exact: true });
  await previous.waitFor();
  assert.deepEqual(JSON.parse(await previous.textContent()), ['', '']);
  assert.equal(state.requests, 2);
}, undefined, async (context, _page, origin) => {
  let finishFirst;
  const delayed = new Promise((resolve) => { finishFirst = resolve; });
  const pathname = '/storage/v1/object/sign/cali-workspace-private/qa-company/logo.png';
  const state = { requests: 0, pathname, releaseFirstRequest: finishFirst };
  await context.route((url) => url.origin === supabaseOrigin && url.pathname === pathname, async (route) => {
    const request = route.request();
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    assert.equal(request.method(), 'POST');
    assert.equal(request.postDataJSON().expiresIn, 3600);
    const first = ++state.requests === 1;
    if (first) await delayed;
    return route.fulfill({
      headers,
      json: { signedURL: '/object/sign/cali-workspace-private/qa-company/logo.png?token=' + (first ? 'primeira' : 'segunda') },
    });
  });
  return state;
});

component('ReportManualComplementsPanel · edição, total, estado concluído e remoção', 'manualComplements', async (page) => {
  await page.getByText('Nenhum complemento manual', { exact: true }).waitFor();
  const groups = page.locator('.reports-v21-manual-group');
  const deliveries = groups.filter({ has: page.getByRole('heading', { name: 'Entregas / atividades', exact: true }) });
  const hours = groups.filter({ has: page.getByRole('heading', { name: 'Tempo complementar', exact: true }) });
  await deliveries.getByRole('button', { name: 'Adicionar', exact: true }).click();
  assert.equal(await deliveries.getByLabel('Concluído em', { exact: true }).count(), 0);
  await deliveries.getByLabel('Entregável / atividade', { exact: true }).fill('Revisão QA');
  await deliveries.getByRole('combobox', { name: /^Status/ }).selectOption('completed');
  await deliveries.getByLabel('Concluído em', { exact: true }).fill('2026-11-12');
  await deliveries.getByLabel('Tempo aplicado (min)', { exact: true }).fill('50');
  await hours.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await hours.getByLabel('Descrição', { exact: true }).fill('Apoio QA');
  await hours.getByLabel('Tempo (min)', { exact: true }).fill('35');
  await page.getByText('1h 25min complementados', { exact: true }).waitFor();
  await deliveries.getByRole('button', { name: 'Remover complemento', exact: true }).click();
  await page.getByText('35min complementados', { exact: true }).waitFor();
  await hours.getByRole('button', { name: 'Remover complemento', exact: true }).click();
  await page.getByText('Nenhum complemento manual', { exact: true }).waitFor();
});

for (const [viewport, width, height] of [
  ['desktop', 1440, 960], ['notebook', 1280, 800], ['tablet', 768, 1024], ['mobile', 390, 844],
]) {
  for (const theme of ['day', 'night']) {
    component(`Variantes visuais · ${viewport} · ${theme}`, 'variants', async (page) => {
      await page.setViewportSize({ width, height });
      const gallery = page.getByRole('main', { name: 'Variantes de componentes' });
      await gallery.waitFor();
      await page.evaluate((theme) => {
        document.documentElement.dataset.workspaceUi = 'v2';
        document.documentElement.dataset.workspaceSurface = 'component-preview';
        document.documentElement.dataset.workspaceTheme = theme;
        document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
      }, theme);
      const actions = gallery.getByRole('region', { name: 'Ações', exact: true });
      assert.equal(await actions.getByRole('button').count(), 13);
      assert(await actions.getByRole('button', { name: 'Indisponível', exact: true }).isDisabled());
      assert.equal(await actions.getByRole('button', { name: 'Salvando…', exact: true }).getAttribute('aria-busy'), 'true');
      await actions.getByRole('button', { name: 'Fechar prévia', exact: true }).waitFor();
      await gallery.getByRole('table', { name: 'Quadro da empresa', exact: true }).waitFor();
      await gallery.getByRole('table', { name: 'Entregas da empresa', exact: true }).waitFor();
      await gallery.getByRole('alert').getByText('Falha ao salvar', { exact: true }).waitFor();
      const withoutContract = gallery.getByRole('group', { name: 'Sem capacidade', exact: true });
      await withoutContract.getByText('Capacidade mensal ainda não definida no contrato.', { exact: true }).waitFor();
      assert.equal(await withoutContract.getByRole('progressbar').count(), 0);
      const over = gallery.getByRole('group', { name: 'Excedente e pausa', exact: true });
      assert.equal(await over.getByRole('progressbar').getAttribute('aria-valuetext'), '122,5% utilizados, 2h 15min acima do contratado');
      await over.getByText('Atividades pausadas até a renovação do mês.', { exact: true }).waitFor();
      const cover = gallery.getByRole('img', { name: 'Logo de Empresa QA', exact: true });
      await cover.waitFor();
      await page.waitForFunction(() => document.querySelector('.fixture-visual .v2-doc-autocover')?.style.background === 'rgb(90, 30, 45)');
      const signatures = gallery.getByRole('region', { name: 'Assinaturas do relatório', exact: true });
      assert.equal(await signatures.locator('.report-signature-generated-v55').count(), 14);
      await signatures.getByRole('img', { name: 'Assinatura de Pessoa QA', exact: true }).waitFor();
      await signatures.getByText('QA-001', { exact: true }).waitFor();
      assert.equal(await signatures.getByText('Aguardando ciência', { exact: true }).count(), 13);
      const geometry = await gallery.evaluate((element) => ({
        viewport: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        galleryWidth: Math.round(element.getBoundingClientRect().width),
        background: getComputedStyle(element).backgroundColor,
        theme: document.documentElement.dataset.workspaceTheme,
      }));
      assert.equal(geometry.pageWidth, geometry.viewport);
      assert.equal(geometry.theme, theme);
      const output = process.env.CALI_COMPONENT_VISUAL_OUTPUT;
      const name = `${viewport}-${theme}`;
      if (output) {
        await mkdir(output, { recursive: true });
        await gallery.screenshot({ path: join(output, name + '.png'), animations: 'disabled', caret: 'hide' });
        await writeFile(join(output, name + '.json'), JSON.stringify(geometry, null, 2) + '\n');
      }

      const frameTrigger = gallery.getByRole('button', { name: 'Abrir diálogo', exact: true });
      await frameTrigger.click();
      const frame = gallery.getByRole('dialog', { name: 'Revisão de entrega', exact: true });
      await frame.waitFor();
      assert.equal(await frame.getAttribute('aria-modal'), 'true');
      if (output) await page.screenshot({ path: join(output, name + '-dialog-frame.png'), animations: 'disabled', caret: 'hide' });
      await page.keyboard.press('Escape');
      await frame.waitFor({ state: 'hidden' });
      assert(await focused(frameTrigger));

      await gallery.getByRole('button', { name: 'Abrir formulário', exact: true }).click();
      const form = gallery.getByRole('dialog', { name: 'Registrar revisão', exact: true });
      const observation = form.getByRole('textbox', { name: 'Observação', exact: true });
      await observation.waitFor();
      assert(await focused(observation));
      assert.equal(await observation.getAttribute('required'), '');
      if (output) await page.screenshot({ path: join(output, name + '-dialog-form.png'), animations: 'disabled', caret: 'hide' });
      await observation.fill('Revisão concluída');
      await page.keyboard.press('Enter');
      await form.waitFor({ state: 'hidden' });

      await gallery.getByRole('button', { name: 'Carregar página', exact: true }).click();
      const loader = page.getByRole('main').filter({ hasText: 'Carregando seu Workspace' });
      await loader.waitFor();
      assert.equal(await loader.getAttribute('aria-busy'), 'true');
      const loaderMark = loader.locator('[data-loader-mark="lime"]');
      await loaderMark.evaluate((element) => {
        for (const animation of element.getAnimations()) {
          animation.pause();
          animation.currentTime = Number(animation.effect?.getComputedTiming().duration) * 0.3;
        }
      });
      const art = await loaderMark.evaluate((element) => {
        const style = getComputedStyle(element);
        return { opacity: Number(style.opacity), mask: style.maskImage };
      });
      assert(art.opacity >= 0.5);
      assert.match(art.mask, /cali-lime-mark/);
      if (output) await page.screenshot({ path: join(output, name + '-route-loader.png'), caret: 'hide' });
    });
  }
}

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
    assert((await email.getAttribute('class')).split(' ').includes('fixture-input'));
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
    assert.equal(await textarea.evaluate((field) => getComputedStyle(field).resize), 'none');
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
    assert.equal(await main.locator('[aria-hidden="true"] [data-loader-mark]').count(), 2);
    await page.evaluate(() => window.dispatchEvent(new Event('qa:resolve-route')));
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
    await page.locator('[data-complete-timer-fixture]').evaluate((button) => button.click());
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
    await page.locator('a[href="/cliente/equipe"][data-tour-highlighted="true"]').waitFor();
    await dialog.getByRole('button', { name: 'Voltar' }).click();
    await dialog.getByRole('heading', { name: 'Bem-vinda' }).waitFor();
    await page.locator('a[href="/cliente/equipe"][data-tour-highlighted]').waitFor({ state: 'detached' });
    await team.waitFor();
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
