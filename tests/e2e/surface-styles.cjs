'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');

async function scope(page, expected) {
  const state = await page.evaluate(() => {
    const { workspaceUi, workspaceSurface, workspaceTheme } = document.documentElement.dataset;
    return {
      workspaceUi: workspaceUi ?? null,
      workspaceSurface: workspaceSurface ?? null,
      workspaceTheme,
      injectedStyle: Boolean(document.getElementById('cali-legacy-styles')),
    };
  });
  assert.deepEqual(state, { ...expected, injectedStyle: false });
}

async function publicSurfaces({ page, context, origin }) {
  await context.addInitScript(() => {
    localStorage.setItem(
      'cali-workspace-theme-override-v1',
      JSON.stringify({ theme: 'night', until: 4070908800000 }),
    );
  });
  await page.goto(origin + '/');
  const entry = page.getByRole('link', { name: 'Entrar no Workspace', exact: true });
  await entry.waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'landing', workspaceTheme: 'night' });
  await page.evaluate(() => { window.__caliSurfaceCheck = 'spa'; });
  await entry.click();
  const login = page.locator('.login-v2');
  await login.waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'sign-in', workspaceTheme: 'night' });
  await page.getByRole('link', { name: 'Termos', exact: true }).click();
  await page.locator('.v2-legal-page').waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'public', workspaceTheme: 'night' });
  await page.goBack();
  await login.waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'sign-in', workspaceTheme: 'night' });
  assert.equal(await page.evaluate(() => window.__caliSurfaceCheck), 'spa');
  return { scopes: ['landing', 'sign-in', 'public', 'sign-in'], theme: 'night' };
}

async function documentSurface({ page, context, origin }) {
  const editorUrl = '/admin/propostas/qa-submission/editar';
  await context.addInitScript(() => {
    localStorage.setItem(
      'cali-workspace-theme-override-v1',
      JSON.stringify({ theme: 'day', until: 4070908800000 }),
    );
  });
  await page.goto(origin + editorUrl);
  const summary = page.locator('.portal-editor-summary.panel');
  await summary.waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'admin-documents', workspaceTheme: 'day' });
  const readSummary = () => summary.evaluate((element) => {
    const line = getComputedStyle(element.querySelector(':scope > div'));
    const action = getComputedStyle(element.querySelector(':scope > button'));
    return {
      padding: getComputedStyle(element).padding,
      metricBorders: [line.borderTopWidth, line.borderRightWidth, line.borderBottomWidth, line.borderLeftWidth],
      actionFontSize: action.fontSize,
    };
  });
  const summaryStyle = { padding: '20px', metricBorders: ['1px', '0px', '0px', '0px'], actionFontSize: '11px' };
  assert.deepEqual(await readSummary(), summaryStyle);
  await page.evaluate(() => { window.__caliSurfaceCheck = 'spa'; });
  await page.locator('.portal-proposal-editor-head').getByRole('button', { name: 'Propostas', exact: true }).click();
  await page.getByRole('heading', { name: 'Propostas', exact: true }).waitFor();
  await scope(page, { workspaceUi: 'v2', workspaceSurface: null, workspaceTheme: 'day' });
  await page.goBack();
  await page.waitForURL((url) => url.pathname === editorUrl);
  await summary.waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'admin-documents', workspaceTheme: 'day' });
  assert.deepEqual(await readSummary(), summaryStyle);
  assert.equal(await page.evaluate(() => window.__caliSurfaceCheck), 'spa');
  return { editorSummary: summaryStyle, inactiveOutsideDocument: true, restoredOnBack: true };
}

async function readBriefingLayout(page) {
  await page.getByRole('button', { name: 'Abrir briefing', exact: true }).click();
  const drawer = page.locator('.portal-admin-drawer');
  await drawer.getByRole('heading', { name: 'Empresa QA fictícia', exact: true }).waitFor();
  const layout = await drawer.evaluate((element) => {
    const style = getComputedStyle(element);
    const scrollArea = getComputedStyle(element.querySelector('.portal-admin-drawer-scroll'));
    return {
      display: style.display,
      width: style.width,
      scroll: scrollArea.overflowY,
      backgroundScroll: getComputedStyle(document.body).overflowY,
    };
  });
  await drawer.getByRole('button', { name: 'Fechar briefing', exact: true }).click();
  await drawer.waitFor({ state: 'detached' });
  return layout;
}

async function proposalBriefing({ page, origin, snapshot }) {
  const listUrl = '/admin/propostas';
  await page.goto(origin + listUrl);
  const direct = await readBriefingLayout(page);
  assert.equal(direct.display, 'flex');
  assert.equal(direct.scroll, 'auto');
  assert.equal(direct.backgroundScroll, 'hidden');

  await page.getByRole('button', { name: 'Abrir briefing', exact: true }).click();
  const drawer = page.locator('.portal-admin-drawer');
  await snapshot('briefing', drawer);
  await drawer.getByRole('button', { name: 'Preparar proposta', exact: true }).click();
  await page.locator('.portal-proposal-editor-head').getByRole('button', { name: 'Propostas', exact: true }).click();
  await page.waitForURL((url) => url.pathname === listUrl);
  assert.deepEqual(await readBriefingLayout(page), direct);
  return { drawer: direct, unchangedAfterEditor: true };
}

async function draftPrint({ page, context, origin, snapshot }) {
  const proposal = {
    id: 'qa-draft', submission_id: 'qa-submission', service_slug: 'assessoria-estrategica',
    version: 2, status: 'rascunho', pdf_path: null, package_code: 'cali-partner',
    final_unit: 5000, contract_months: 8, validity_days: 15,
    calculator_data: { monthlyHours: 12 }, scope_items: ['Análise de prioridades'],
    created_at: '2026-11-12T12:00:00Z', updated_at: '2026-11-12T12:00:00Z',
    submission: { id: 'qa-submission', protocol: 'CALI-QA', contact_name: 'Pessoa QA', company_name: 'Empresa QA' },
  };
  await context.route((url) => url.pathname === '/rest/v1/cali_proposals', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: [proposal], headers: { 'access-control-allow-origin': origin } });
  });
  await context.route('https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-*.png', (route) => {
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="34"><rect width="90" height="34" fill="#b58c52"/></svg>',
    });
  });
  await page.goto(origin + '/admin/propostas/proposta/qa-draft');
  const paper = page.locator('.portal-proposal-page.proposal-cover');
  await paper.getByRole('heading', { name: 'Olá, Pessoa.', exact: true }).waitFor();
  const preview = await paper.evaluate((element) => {
    const band = element.querySelector('.proposal-cover-band');
    const service = band.querySelector('.cover-service strong');
    return {
      width: element.getBoundingClientRect().width,
      bandBottom: band.getBoundingClientRect().bottom,
      serviceBottom: service.getBoundingClientRect().bottom,
      greetingSize: parseFloat(getComputedStyle(band.querySelector('h1')).fontSize),
      background: getComputedStyle(band, '::before').backgroundColor,
    };
  });
  assert(preview.width <= 390, 'A capa deve caber no celular: ' + JSON.stringify(preview));
  assert(preview.serviceBottom <= preview.bandBottom, 'O nome do serviço deve ficar dentro da faixa');
  assert(preview.greetingSize <= 34, 'A saudação deve caber na capa estreita');
  assert.equal(preview.background, 'rgb(90, 30, 45)');
  await snapshot('capa-mobile', paper);
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.waitForFunction(() => {
    const cover = document.querySelector('.portal-proposal-page.proposal-cover');
    if (!cover || !matchMedia('print').matches) return false;
    const { x, y } = cover.getBoundingClientRect();
    return Math.abs(x) < 1 && Math.abs(y) < 1;
  }, undefined, { timeout: 2500 });
  const geometry = await paper.evaluate((element) => {
    const style = getComputedStyle(element);
    const { x, y } = element.getBoundingClientRect();
    return {
      width: parseFloat(style.width), height: parseFloat(style.height), breakAfter: style.breakAfter,
      x, y,
      toolbar: getComputedStyle(document.querySelector('.portal-proposal-preview-toolbar')).display,
    };
  });
  assert(Math.abs(geometry.width - (210 * 96) / 25.4) < 1);
  assert(Math.abs(geometry.height - (296 * 96) / 25.4) < 1);
  assert.equal(geometry.breakAfter, 'page');
  assert.equal(geometry.toolbar, 'none');
  assert(Math.abs(geometry.x) < 1 && Math.abs(geometry.y) < 1, 'A capa deve iniciar na origem da folha: ' + JSON.stringify(geometry));
  await page.getByText('Preparação e revisão com Partner', { exact: true }).waitFor({ state: 'hidden' });
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  const physicalPages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.equal(physicalPages, await page.locator('.portal-proposal-page').count());
  await snapshot('a4', paper);
  return { paper: '210 × 296 mm', origin: [geometry.x, geometry.y], physicalPages, toolbarHidden: true };
}

browserSuite([
  { id: 'surface-public-night-spa', role: 'public', run: publicSurfaces },
  { id: 'surface-admin-document-spa', role: 'admin', run: documentSurface },
  { id: 'surface-proposal-briefing-spa', role: 'admin', run: proposalBriefing },
  { id: 'surface-proposal-draft-print', role: 'admin', width: 390, run: draftPrint },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
