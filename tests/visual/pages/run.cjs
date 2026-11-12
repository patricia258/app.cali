'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { isDeepStrictEqual, parseArgs } = require('node:util');
const { setTimeout: pause } = require('node:timers/promises');
const { makeContext, relative } = require('../../e2e/browser-fixture.cjs');
const {
  defaultChrome,
  serve,
  denyProxy,
  launchBrowser,
  closeBrowser,
  finishCli,
} = require('../../e2e/loopback.cjs');
const { user } = require('../../e2e/fixtures.cjs');
const { buildArtifact, fixtureOrigin, sha } = require('./build.cjs');
const { comparePixels, threshold } = require('./pixels.cjs');
const { scenarios } = require('./scenarios.cjs');
const { classify } = require('./classify.cjs');

const date = '2026-11-12T12:30:00Z';
const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
  laptop: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
};
const legacyCommercialOrigin = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const legacyCommercialReads = new Set([
  '/rest/v1/cali_submissions',
  '/rest/v1/cali_proposals',
  '/rest/v1/cali_pricing_rules',
  '/rest/v1/cali_activity',
  '/rest/v1/mapa_respostas',
]);
const reportFixture = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Mapa QA</title>
<body style="margin:0;padding:72px 24px;color:#5a1e2d;background:#f7f3ee;font:16px system-ui">
<main style="max-width:650px;margin:auto;padding:24px;background:#fff;border-radius:16px">
<h1>Relatório de Mapa QA</h1><p>Documento sintético usado para verificar o quadro do relatório.</p>
</main></body></html>`;
const { values } = parseArgs({
  options: {
    output: { type: 'string' },
    reference: { type: 'string', default: '773c9d4' },
    candidate: { type: 'string', default: 'HEAD' },
    'reference-dist': { type: 'string' },
    'candidate-dist': { type: 'string' },
    'reference-terms': { type: 'string', default: '2026-10-15' },
    chrome: { type: 'string', default: process.env.CALI_E2E_CHROME || defaultChrome() },
    viewport: { type: 'string', multiple: true },
    role: { type: 'string', multiple: true },
    case: { type: 'string', multiple: true },
    jobs: { type: 'string', default: '3' },
    list: { type: 'boolean' },
    help: { type: 'boolean' },
    'require-equivalent': { type: 'boolean' },
  },
});

const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const name = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52) || 'raiz';

async function artifactHash(dist) {
  const paths = (await fs.readdir(dist, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath || entry.path, entry.name).slice(dist.length + 1))
    .sort();
  const manifest = {};
  let fixtureFound = false;
  for (const path of paths) {
    const file = await fs.readFile(join(dist, path));
    manifest[path] = hash(file);
    if (path.startsWith('assets/') && path.endsWith('.js') && file.includes(fixtureOrigin)) fixtureFound = true;
  }
  assert(fixtureFound, 'O build não usa a URL Supabase sintética: ' + dist);
  return { fileCount: paths.length, hash: hash(JSON.stringify(manifest)) };
}

async function waitStable(page, pending) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root');
      return Boolean(
        root?.children.length &&
        root.innerText.trim() &&
        ![...root.querySelectorAll('.route-loading,.v2-mfa-wait')].some((element) => element.checkVisibility()),
      );
    },
    null,
    { timeout: 7000 },
  );
  let previous;
  let stableSince = Date.now();
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    let signature;
    try {
      signature = await page.evaluate(() => [
        location.pathname + location.search + location.hash,
        document.querySelector('#root')?.innerText,
        document.documentElement.scrollHeight,
        [...document.querySelectorAll('.route-loading,.v2-mfa-wait,.data-loading,.team-loading')]
          .filter((element) => element.checkVisibility())
          .map((element) => element.textContent.trim()),
      ]);
    } catch (error) {
      if (!error.message.includes('Execution context was destroyed')) throw error;
    }
    if (!signature?.[1] || pending.size || signature[3].length || !isDeepStrictEqual(signature, previous))
      stableSince = Date.now();
    if (Date.now() - stableSince >= 180) return;
    previous = signature;
    await pause(40);
  }
  const waiting = [...pending].slice(0, 10).map((request) => new URL(request.url()).pathname);
  throw new Error(
    'DOM ou rede sintética não estabilizaram: ' + JSON.stringify({ waiting, loaders: previous?.[3] }),
  );
}

async function prepareImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.images].filter((image) => image.offsetWidth && image.offsetHeight);
    for (const image of visible) if (image.loading === 'lazy') image.loading = 'eager';
    await Promise.all(visible.map((image) => image.decode().catch(() => {})));
    await Promise.all([...document.querySelectorAll('video')].map((video) => {
      video.autoplay = false;
      video.pause();
      if (!video.readyState || video.currentTime === 0) return;
      return new Promise((resolve) => {
        const timer = window.setTimeout(resolve, 700);
        video.addEventListener('seeked', () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
        video.currentTime = 0;
      });
    }));
  });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

async function captureDetail(page, directory, label, mapReport, id) {
  const filename = label + '-detail.png';
  let detail;
  if (mapReport) {
    const frame = 'iframe[title="Mapa de People — Relatório oficial"]';
    // Paint identical local content in the host renderer. The separate Mapa E2E verifies the cross-origin contract.
    await page.locator(frame).evaluate((element, fixture) => {
      element.srcdoc = fixture;
    }, reportFixture);
    const heading = page.frameLocator(frame).getByRole('heading', { name: 'Relatório de Mapa QA', exact: true });
    await heading.waitFor();
    await page.locator('button:enabled').filter({ hasText: 'Imprimir / Salvar PDF' }).waitFor();
    await heading.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    detail = page.locator(frame);
  } else if (id === 'landing:carrossel-segunda-tela') {
    const carousel = page.getByRole('region', { name: 'Telas do CALI Workspace na prática' });
    const picture = carousel.locator('.lp-screen-slide.is-active img');
    await picture.evaluate((image) => image.decode());
    await page.mouse.move(0, 0);
    detail = carousel;
  } else if (id === 'landing:ancora-workspace') {
    detail = page.locator('#workspace');
  }
  if (!detail) return undefined;
  const screenshot = await detail.screenshot({
    path: join(directory, filename),
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    timeout: 12000,
  });
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  return { filename, hash: hash(screenshot) };
}

async function describe(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#root');
    const visible = (element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    const text = (element) => element.innerText.replace(/\s+/g, ' ').trim();
    const topbar = [...root.querySelectorAll('.topbar')].find(visible);
    const controls = topbar ? [...topbar.querySelectorAll('button,a,input')].filter(visible) : [];
    const clippedControls = controls
      .filter((element) => {
        const { left, right } = element.getBoundingClientRect();
        return left < -1 || right > innerWidth + 1;
      })
      .map((element) => element.getAttribute('aria-label') || element.getAttribute('title') || text(element));
    const title = root.querySelector('.ap-title');
    const titleActions = title?.querySelector('.ap-title-actions');
    const titleCopy = title?.firstElementChild?.lastElementChild ?? title?.firstElementChild;
    const titleActionsGap =
      titleCopy && titleActions
        ? Math.max(
            0,
            Math.round(titleActions.getBoundingClientRect().top - titleCopy.getBoundingClientRect().bottom),
          )
        : null;
    const print = [...root.querySelectorAll('button')].find(
      (element) => text(element) === 'Imprimir / Salvar PDF',
    );
    const reportToolbar = root.querySelector('iframe[title="Mapa de People — Relatório oficial"]')
      ? print?.closest('header')
      : null;
    const reportToolbarClipped = reportToolbar
      ? [...reportToolbar.querySelectorAll('button,a')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            let right = innerWidth;
            for (
              let parent = element.parentElement;
              parent && parent !== reportToolbar;
              parent = parent.parentElement
            ) {
              if (getComputedStyle(parent).overflowX !== 'visible')
                right = Math.min(right, parent.getBoundingClientRect().right);
            }
            return box.right > right + 1;
          })
          .map(text)
      : null;
    const frame = [...document.querySelectorAll('main, aside.sidebar, [role="dialog"]')]
      .filter(visible)
      .slice(0, 12)
      .map((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          name: element.getAttribute('aria-label') || element.tagName.toLowerCase(),
          active: document.activeElement === element,
          outline: style.outline,
          x: Math.round(box.x + scrollX),
          y: Math.round(box.y + scrollY),
          width: Math.round(box.width),
          height: Math.round(box.height),
          color: style.color,
          background: style.backgroundColor,
          fontFamily: style.fontFamily,
        };
      });
    return {
      url: location.pathname + location.search + location.hash,
      title: document.title,
      theme: document.documentElement.dataset.workspaceTheme ?? null,
      headings: [...root.querySelectorAll('h1,h2')].filter(visible).map(text).slice(0, 35),
      menus: [...root.querySelectorAll('.sidebar a[href]')].map((element) => element.getAttribute('href')),
      dialogs: [...document.querySelectorAll('[role="dialog"]')]
        .filter(visible)
        .map(
          (element) =>
            element.getAttribute('aria-label') ||
            document.getElementById(element.getAttribute('aria-labelledby'))?.textContent ||
            text(element).slice(0, 100),
        ),
      bodyText: root.innerText,
      overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      titleActionsGap,
      reportToolbarClipped,
      topbar: topbar
        ? { height: Math.round(topbar.getBoundingClientRect().height), controls: controls.length, clippedControls }
        : null,
      frame,
    };
  });
}

async function capture(browser, origin, label, task, directory) {
  const { role, id, viewport } = task;
  const mapReport = role === 'admin' && id.startsWith('/admin/mapa-de-people/relatorio/qa-map');
  const { context, blocked, mocked } = await makeContext(browser, origin, role, {
    viewport: viewports[viewport],
    hasTouch: viewport === 'mobile',
  });
  const errors = new Set();
  const assets = new Set();
  const pending = new Set();
  const capturePath = join(directory, label + '.png');
  let page;
  let error;
  let signature;
  let screenshot;
  let detail;
  let ignoredLegacyReads = 0;
  try {
    if (mapReport) {
      await context.route(
        (url) =>
          url.origin === 'https://mapa.calirh.com' &&
          url.pathname === '/relatorio.html' &&
          url.searchParams.get('id') === 'qa-map' &&
          url.searchParams.get('workspace') === '1',
        (route) => {
          if (route.request().method() !== 'GET') return route.abort('blockedbyclient');
          return route.fulfill({ contentType: 'text/html; charset=utf-8', body: reportFixture });
        },
      );
    }
    if (label === 'reference' && role === 'admin') {
      // The old proposal client embeds the production origin. Route read-only requests into the same fixture.
      await context.route(
        (url) => url.origin === legacyCommercialOrigin && legacyCommercialReads.has(url.pathname),
        (route) => {
          const request = route.request();
          if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.abort('blockedbyclient');
          return route.fallback({ url: fixtureOrigin + relative(request.url()) });
        },
      );
    }
    if (label === 'reference' && role !== 'public') {
      await context.route(
        (url) =>
          url.origin === fixtureOrigin &&
          url.pathname === '/rest/v1/terms_acceptances' &&
          url.searchParams.get('version') === 'eq.' + values['reference-terms'],
        (route) => {
          const request = route.request();
          const acceptObject = request.headers().accept?.includes('vnd.pgrst.object');
          const receipt = { user_id: user.id, version: values['reference-terms'] };
          const headers = {
            'access-control-allow-origin': origin,
            'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
          };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (request.method() !== 'GET') return route.fallback();
          return route.fulfill({ json: acceptObject ? receipt : [receipt], headers });
        },
      );
    }
    page = await context.newPage();
    await page.clock.setFixedTime(new Date(date));
    page.setDefaultTimeout(6500);
    page.on('pageerror', (error) => errors.add(error.message.replaceAll(origin, 'ORIGIN')));
    page.on('console', (message) => {
      if (message.type() === 'error' && /CALI Workspace · erro de renderização/.test(message.text()))
        errors.add(message.text().split('\n')[0].replaceAll(origin, 'ORIGIN'));
    });
    page.on('response', (response) => {
      if (response.url().startsWith(origin + '/') && response.status() >= 400)
        assets.add(`${response.status()} ${relative(response.url())}`);
    });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        label === 'reference' &&
        role === 'admin' &&
        new URL(page.url()).pathname === '/admin/projetos' &&
        url.origin === fixtureOrigin &&
        request.method() === 'GET' &&
        (url.pathname === '/rest/v1/deliverable_delivery_performance' ||
          (url.pathname === '/rest/v1/projects' && url.searchParams.has('protocol')))
      ) {
        ignoredLegacyReads++;
        return;
      }
      pending.add(request);
    });
    page.on('requestfinished', (request) => pending.delete(request));
    page.on('requestfailed', (request) => pending.delete(request));
    const go = async (path) => {
      const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, 'Resposta de navegação');
      await waitStable(page, pending);
    };
    await task.run({ page, go, id, role });
    await waitStable(page, pending);
    await prepareImages(page);
    detail = await captureDetail(page, directory, label, mapReport, id);
    await waitStable(page, pending);
    signature = await describe(page);
  } catch (failure) {
    error = String(failure.message).replaceAll(origin, 'ORIGIN').split('\n').slice(0, 8).join('\n');
    if (page) signature = await describe(page).catch(() => undefined);
  } finally {
    if (page) {
      try {
        screenshot = await page.screenshot({
          path: capturePath,
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
          timeout: 12000,
        });
      } catch (failure) {
        error ||= String(failure.message).replaceAll(origin, 'ORIGIN');
      }
    }
    await context.close();
  }
  if (signature) {
    const { bodyText, ...metadata } = signature;
    await fs.writeFile(join(directory, label + '.txt'), bodyText + '\n');
    signature = { ...metadata, textHash: hash(bodyText) };
  }
  return {
    signature,
    screenshot,
    detail,
    ignoredLegacyReads,
    error,
    errors: [...errors],
    assets: [...assets],
    blocked: [...blocked].sort(),
    mocked: [...mocked].sort(),
  };
}

async function compare(browser, servers, task, output) {
  const { role, id, viewport } = task;
  const folder = join(viewport, role, `${name(id)}-${hash(id).slice(0, 8)}`);
  const directory = join(output, folder);
  await fs.mkdir(directory, { recursive: true });
  const [reference, candidate] = await Promise.all(
    Object.entries(servers).map(([label, server]) => capture(browser, server.origin, label, task, directory)),
  );
  const captures = [reference, candidate];
  let pixels;
  let detailPixels;
  if (captures.every((state) => state.screenshot)) {
    const { overlay, ...metric } = comparePixels(reference.screenshot, candidate.screenshot);
    if (overlay) await fs.writeFile(join(directory, 'diff.png'), overlay);
    pixels = metric;
  }
  if (captures.every((state) => state.detail)) {
    const [before, after] = await Promise.all(
      captures.map((state) => fs.readFile(join(directory, state.detail.filename))),
    );
    const { overlay, ...metric } = comparePixels(before, after);
    if (overlay) await fs.writeFile(join(directory, 'detail-diff.png'), overlay);
    detailPixels = metric;
  }
  for (const state of captures) {
    if (state.screenshot) state.screenshot = hash(state.screenshot);
  }
  const healthy = (state) =>
    Boolean(!state.error && !state.errors.length && !state.assets.length && state.screenshot);
  const differences = Object.keys({ ...reference.signature, ...candidate.signature }).filter(
    (key) => !isDeepStrictEqual(reference.signature?.[key], candidate.signature?.[key]),
  );
  const status = !healthy(candidate)
    ? 'candidate-failure'
    : !healthy(reference)
      ? 'reference-limitation'
      : pixels?.changedPixels || differences.length
        ? 'different'
        : 'equivalent';
  const texts =
    status === 'different'
      ? await Promise.all(
          ['reference', 'candidate'].map((label) => fs.readFile(join(directory, label + '.txt'), 'utf8')),
        )
      : [];
  const result = { role, id, viewport, status, folder, differences, pixels, detailPixels, reference, candidate };
  return { ...result, classification: classify(result, texts) };
}

async function report(output, rows, metadata) {
  const totals = Object.fromEntries(
    ['equivalent', 'different', 'reference-limitation', 'candidate-failure'].map((status) => [
      status,
      rows.filter((row) => row.status === status).length,
    ]),
  );
  await fs.writeFile(join(output, 'result.json'), JSON.stringify({ ...metadata, totals, rows }, null, 2) + '\n');
  const lines = [
    '# Comparação visual de páginas completas',
    '',
    'Referência `' + metadata.reference.commit + '`. Candidato `' + metadata.candidate.commit + '`.',
    '',
    'SHA-256 dos manifestos de arquivos `' + metadata.reference.hash + '` e `' + metadata.candidate.hash + '`.',
    '',
    `${rows.length} comparações. ${totals.equivalent} equivalentes, ${totals.different} com diferença, ${totals['reference-limitation']} com limitação na referência, ${totals['candidate-failure']} com falha no candidato.`,
    '',
    `Datas fixas em ${date}. Screenshots full page em CSS pixels. O diff marca canais que mudaram ao menos ${threshold}/255 e pixels sem equivalente por mudança de dimensões. O JSON registra também a contagem exata. Fontes remotas e serviços externos bloqueados.`,
    '',
    `Chromium ${metadata.browser}. Dados e iframe de Mapa sintéticos. [Medições e metadados](result.json).`,
    '',
    '| Perfil | Tela/estado | Tamanho | Resultado | Pixels alterados | Sinais | Classificação | Evidência |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |',
  ];
  for (const row of rows) {
    const evidence = ['reference', 'candidate']
      .filter((label) => row[label].screenshot)
      .map((label) => `[${label}](${row.folder}/${label}.png)`);
    if (row.pixels?.changedPixels) evidence.push(`[diff](${row.folder}/diff.png)`);
    for (const label of ['reference', 'candidate']) {
      if (row[label].detail) evidence.push(`[detalhe ${label}](${row.folder}/${row[label].detail.filename})`);
    }
    if (row.detailPixels?.changedPixels) evidence.push(`[diff detalhe](${row.folder}/detail-diff.png)`);
    if (row.differences.includes('textHash'))
      evidence.push(`[texto main](${row.folder}/reference.txt)`, `[texto candidato](${row.folder}/candidate.txt)`);
    lines.push(
      `| ${row.role} | \`${row.id}\` | ${row.viewport} | ${row.status} | ${row.pixels?.changedPercent ?? '—'}% | ${row.differences.join(', ') || '—'} | ${row.classification.detail} | ${evidence.join(' · ')} |`,
    );
  }
  await fs.writeFile(join(output, 'REPORT.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ output, total: rows.length, ...totals }));
}

async function main() {
  if (values.help) {
    console.log(
      [
        'node tests/visual/pages/run.cjs [opções]',
        '--reference SHA --candidate SHA    Referência 773c9d4, candidato HEAD por padrão',
        '--reference-dist DIR --candidate-dist DIR    Builds sintéticos já compilados',
        '--output DIR --chrome BIN --jobs N    Artefatos, navegador e paralelismo',
        '--viewport desktop|mobile|laptop|tablet    Repetível, desktop/mobile por padrão',
        '--role PERFIL --case TRECHO --list    Filtros repetíveis e inventário',
        '--reference-terms VERSÃO    Recibo sintético legado, por padrão 2026-10-15',
        '--require-equivalent    Retorna falha quando houver diferença ou limitação',
        'Sem build fornecido, o runner usa Git archive e npm ci --offline.',
      ].join('\n'),
    );
    return;
  }
  const chosen = values.viewport || ['desktop', 'mobile'];
  assert(
    chosen.every((value) => Object.hasOwn(viewports, value)),
    'Viewport desconhecido',
  );
  const jobs = Number(values.jobs);
  assert(Number.isInteger(jobs) && jobs >= 1 && jobs <= 6, '--jobs deve estar entre 1 e 6');
  const tasks = scenarios()
    .filter(
      ({ role, id }) =>
        (!values.role || values.role.includes(role)) &&
        (!values.case || values.case.some((query) => id.includes(query))),
    )
    .flatMap((scenario) =>
      chosen
        .filter((viewport) => !scenario.onlyViewport || scenario.onlyViewport === viewport)
        .map((viewport) => ({ ...scenario, viewport })),
    );
  assert(tasks.length, 'Nenhum cenário selecionado');
  if (values.list) {
    console.log(JSON.stringify({ total: tasks.length, tasks }, null, 2));
    return;
  }
  const output = values.output ? resolve(values.output) : await fs.mkdtemp(join(tmpdir(), 'cali-visual-pages-'));
  await fs.mkdir(output, { recursive: true });
  const metadata = { date, viewports, threshold };
  for (const label of ['reference', 'candidate']) {
    const commit = sha(values[label]);
    const dist = values[label + '-dist'] ? resolve(values[label + '-dist']) : buildArtifact(output, label, commit);
    metadata[label] = {
      commit,
      dist,
      source: values[label + '-dist'] ? 'provided-dist' : 'git-archive',
      ...(await artifactHash(dist)),
    };
  }
  const proxy = await denyProxy();
  const servers = {};
  let browser;
  try {
    for (const label of ['reference', 'candidate']) servers[label] = await serve(metadata[label].dist);
    browser = await launchBrowser(values.chrome, proxy);
    metadata.browser = browser.version();
    const rows = [];
    let cursor = 0;
    await Promise.all(
      Array.from({ length: jobs }, async () => {
        while (cursor < tasks.length) {
          const index = cursor++;
          const result = await compare(browser, servers, tasks[index], output);
          rows[index] = result;
          const { role, id, viewport, status, pixels, candidate } = result;
          console.error(
            JSON.stringify({
              index: index + 1,
              total: tasks.length,
              role,
              id,
              viewport,
              status,
              changedPercent: pixels?.changedPercent,
              error: candidate.error,
              assets: candidate.assets,
            }),
          );
        }
      }),
    );
    await report(output, rows, metadata);
    if (
      rows.some(
        (row) =>
          row.status === 'candidate-failure' || (values['require-equivalent'] && row.status !== 'equivalent'),
      )
    )
      process.exitCode = 1;
  } finally {
    for (const server of Object.values(servers)) server.close();
    proxy.close();
    await closeBrowser(browser);
  }
}

finishCli(main);
