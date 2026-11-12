'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { defaultChrome, serve, denyProxy, launchBrowser, closeBrowser } = require('./loopback.cjs');
const { makeContext, relative } = require('./browser-fixture.cjs');

async function browserSuite(cases) {
  const { values } = parseArgs({
    options: {
      dist: { type: 'string' },
      output: { type: 'string' },
      case: { type: 'string', multiple: true },
      chrome: { type: 'string', default: process.env.CALI_E2E_CHROME || defaultChrome() },
    },
  });
  assert(values.dist && values.output, '--dist e --output obrigatórios');
  const selected = cases.filter((test) => !values.case || values.case.some((query) => test.id.includes(query)));
  assert(selected.length, 'Nenhum caso selecionado');
  await fs.mkdir(values.output, { recursive: true });
  const proxy = await denyProxy();
  const server = await serve(values.dist);
  let browser;
  try {
    browser = await launchBrowser(values.chrome, proxy);
    const results = [];
    for (const test of selected) {
      const width = test.width ?? 1440;
      const actors = [];
      const pageErrors = [];
      const assetFailures = [];
      async function openActor(role) {
        const { context } = await makeContext(browser, server.origin, role, {
          viewport: { width, height: width < 500 ? 844 : 960 },
          hasTouch: test.input === 'touch',
          timezoneId: test.timezoneId,
        });
        actors.push(context);
        const page = await context.newPage();
        page.on('pageerror', (error) => pageErrors.push(error.message.replaceAll(server.origin, 'ORIGIN')));
        page.on('response', (response) => {
          if (response.url().startsWith(server.origin + '/assets/') && response.status() >= 400) {
            assetFailures.push({ path: relative(response.url()), status: response.status() });
          }
        });
        page.setDefaultTimeout(6500);
        return { page, context };
      }
      const { page, context } = await openActor(test.role);
      let failure;
      let detail;
      const snapshot = (name, locator = page) =>
        locator.screenshot({
          path: path.join(values.output, test.id + '-' + name + '.png'),
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
          timeout: 5000,
        });
      try {
        detail = await test.run({ page, context, origin: server.origin, snapshot, openActor });
        assert.deepEqual(pageErrors, [], 'Erro JavaScript');
        assert.deepEqual(assetFailures, [], 'Asset com resposta de erro');
      } catch (error) {
        failure = String(error.message).replaceAll(server.origin, 'ORIGIN').split('\n').slice(0, 10).join('\n');
        await snapshot('error').catch(() => {});
      } finally {
        await Promise.all(actors.map((context) => context.close()));
      }
      const row = { id: test.id, passed: !failure, detail, failure, pageErrors, assetFailures };
      results.push(row);
      console.error(JSON.stringify(row));
    }
    const summary = { passed: results.filter((result) => result.passed).length, total: results.length, results };
    await fs.writeFile(path.join(values.output, 'result.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(JSON.stringify({ ...summary, results: undefined }));
    if (summary.passed !== summary.total) process.exitCode = 1;
  } finally {
    server.close();
    proxy.close();
    await closeBrowser(browser);
  }
}

function press(locator, input) {
  if (input === 'keyboard') return locator.press('Enter', { timeout: 3500 });
  if (input === 'touch') return locator.tap({ timeout: 3500 });
  return locator.click({ timeout: 3500 });
}

async function answerWorkspaceDialog(page, accept) {
  const open = page.locator('dialog.workspace-action-dialog[open]');
  await open.waitFor();
  const message = await open.getAttribute('aria-label');
  const dialog = page.getByRole('dialog', { name: message, exact: true });
  await dialog.getByRole('button', { name: accept ? 'Confirmar' : 'Cancelar', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  return message;
}

module.exports = { answerWorkspaceDialog, browserSuite, press };
