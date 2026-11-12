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
  const entry = page.locator('.lp-hero-login');
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
  const summaryPadding = () => summary.evaluate((element) => getComputedStyle(element).padding);
  assert.equal(await summaryPadding(), '20px');
  await page.evaluate(() => { window.__caliSurfaceCheck = 'spa'; });
  await page.locator('.portal-proposal-editor-head').getByRole('button', { name: 'Propostas', exact: true }).click();
  await page.getByRole('heading', { name: 'Propostas', exact: true }).waitFor();
  await scope(page, { workspaceUi: 'v2', workspaceSurface: null, workspaceTheme: 'day' });
  await page.goBack();
  await page.waitForURL((url) => url.pathname === editorUrl);
  await summary.waitFor();
  await scope(page, { workspaceUi: null, workspaceSurface: 'admin-documents', workspaceTheme: 'day' });
  assert.equal(await summaryPadding(), '20px');
  assert.equal(await page.evaluate(() => window.__caliSurfaceCheck), 'spa');
  return { editorPadding: '20px', inactiveOutsideDocument: true, restoredOnBack: true };
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
  await page.emulateMedia({ media: 'print' });
  const geometry = await paper.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: parseFloat(style.width), height: parseFloat(style.height), breakAfter: style.breakAfter,
      toolbar: getComputedStyle(document.querySelector('.portal-proposal-preview-toolbar')).display,
    };
  });
  assert(Math.abs(geometry.width - (210 * 96) / 25.4) < 1);
  assert(Math.abs(geometry.height - (296 * 96) / 25.4) < 1);
  assert.equal(geometry.breakAfter, 'page');
  assert.equal(geometry.toolbar, 'none');
  await snapshot('a4', paper);
  return { paper: '210 × 296 mm', breakAfter: geometry.breakAfter, toolbarHidden: true };
}

browserSuite([
  { id: 'surface-public-night-spa', role: 'public', run: publicSurfaces },
  { id: 'surface-admin-document-spa', role: 'admin', run: documentSurface },
  { id: 'surface-proposal-draft-print', role: 'admin', run: draftPrint },
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
