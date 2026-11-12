'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { closeBrowser, defaultChrome, denyProxy, finishCli, launchBrowser } = require('../e2e/loopback.cjs');

const app = 'http://127.0.0.1:56430';
const api = 'http://127.0.0.1:56431';
const mail = 'http://127.0.0.1:56432';

async function latestCode(email, since) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const inbox = await fetch(`${mail}/api/v1/messages?limit=50`, { signal: AbortSignal.timeout(4000) }).then((response) => response.json());
    const message = inbox.messages?.find((entry) => Date.parse(entry.Created) >= since
      && entry.To?.some((recipient) => recipient.Address === email) && /código/i.test(entry.Subject));
    if (message) {
      const content = await fetch(`${mail}/api/v1/message/${encodeURIComponent(message.ID)}`, { signal: AbortSignal.timeout(4000) })
        .then((response) => response.json());
      const codes = new Set([...String(content.HTML).matchAll(/>\s*([0-9]{6})\s*</g)].map((match) => match[1]));
      assert.equal(codes.size, 1, 'Mailpit precisa conter um código de acesso.');
      return [...codes][0];
    }
    await delay(250);
  }
  throw new Error(`Mailpit não recebeu código para ${email}. A janela de reenvio é de dois minutos.`);
}

async function verifyCompany(browser, { email, own, other }) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const request = new URL(route.request().url());
    return [app, api].includes(request.origin) ? route.continue() : route.abort();
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(12_000);
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.name));
    await page.goto(`${app}/cliente/registros`);
    const input = page.getByLabel('E-mail', { exact: true });
    await input.waitFor().catch(async () => {
      throw new Error(`Login indisponível no Vite de QA (${new URL(page.url()).pathname}). Abra o servidor local com o runbook. Erros de página: ${failures.join(', ') || 'nenhum'}.`);
    });
    await input.fill(email);
    const since = Date.now() - 1000;
    const request = page.waitForResponse((response) => response.url() === `${api}/functions/v1/workspace-access`);
    await page.getByRole('button', { name: 'Enviar código de acesso' }).click();
    assert((await request).ok(), 'Pedido de código falhou no Edge local.');
    const code = await latestCode(email, since);
    await page.getByLabel('Código de acesso').fill(code);
    const verification = page.waitForResponse((response) => response.url() === `${api}/functions/v1/workspace-access`);
    await page.getByRole('button', { name: 'Entrar no Workspace' }).click();
    assert((await verification).ok(), 'Edge local recusou a verificação do código de acesso.');
    await page.waitForURL((url) => url.pathname.startsWith('/cliente'));
    await page.goto(`${app}/cliente/registros`);

    const terms = page.getByRole('heading', { name: 'Termos de uso e privacidade' });
    const records = page.getByRole('heading', { name: 'Ocorrências', exact: true });
    await terms.or(records).first().waitFor();
    if (await terms.isVisible()) {
      await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    }
    await records.waitFor();
    const tour = page.getByRole('button', { name: 'Fechar apresentação' });
    const tourVisible = await tour.waitFor({ timeout: 1500 }).then(() => true, () => false);
    if (tourVisible) await tour.click();
    await page.getByText(own, { exact: true }).waitFor();
    assert.equal(await page.getByText(other, { exact: true }).count(), 0, 'Ocorrência de outra empresa apareceu.');
    await page.getByRole('button', { name: `Abrir ${own}`, exact: true }).click();
    await page.getByRole('dialog', { name: own, exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.profile[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: 'Sair', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/');
    assert.deepEqual(failures, [], 'Erro de JavaScript no navegador.');
  } finally {
    await context.close();
  }
}

finishCli(async () => {
  execFileSync('bash', ['.cali-db-schema.local/qa/check-topology.sh'], { stdio: 'inherit' });
  const proxy = await denyProxy();
  let browser;
  try {
    browser = await launchBrowser(defaultChrome(), proxy);
    await verifyCompany(browser, { email: 'cliente-a2@example.test', own: 'Ocorrência legada A QA', other: 'Ocorrência legada B QA' });
    await verifyCompany(browser, { email: 'cliente-b@example.test', own: 'Ocorrência legada B QA', other: 'Ocorrência legada A QA' });
    console.log('PASS Playwright local · OTP, termos, duas empresas, ocorrência legada e logout');
  } finally {
    await closeBrowser(browser);
    await proxy.close();
  }
});
