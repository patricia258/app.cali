'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { closeBrowser, defaultChrome, denyProxy, finishCli, launchBrowser } = require('../e2e/loopback.cjs');

const app = 'http://127.0.0.1:56430';
const api = 'http://127.0.0.1:56431';
const mail = 'http://127.0.0.1:56432';

async function latestCode(email, since, previousMessageId) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const inbox = await fetch(`${mail}/api/v1/messages?limit=50`, { signal: AbortSignal.timeout(4000) }).then((response) => response.json());
    const message = inbox.messages?.find((entry) => entry.ID !== previousMessageId && Date.parse(entry.Created) >= since
      && entry.To?.some((recipient) => recipient.Address === email) && /código/i.test(entry.Subject));
    if (message) {
      const content = await fetch(`${mail}/api/v1/message/${encodeURIComponent(message.ID)}`, { signal: AbortSignal.timeout(4000) })
        .then((response) => response.json());
      const codes = new Set([...String(content.HTML).matchAll(/>\s*([0-9]{6})\s*</g)].map((match) => match[1]));
      assert.equal(codes.size, 1, 'Mailpit precisa conter um código de acesso.');
      return { messageId: message.ID, code: [...codes][0] };
    }
    await delay(250);
  }
  throw new Error(`Mailpit não recebeu código para ${email}. A janela de reenvio é de dois minutos.`);
}

async function verifyCompany(browser, { email, own, other, checkResend = false }) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route((url) => ![app, api].includes(url.origin), (route) => route.abort());
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(12_000);
    if (checkResend) await page.clock.install();
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
    let access = await latestCode(email, since);
    if (checkResend) {
      const resend = page.getByRole('button', { name: 'Reenviar código', exact: true });
      await resend.waitFor();
      assert(await resend.isDisabled(), 'O reenvio deve aguardar o intervalo de dois minutos.');
      await page.getByText(/Você pode reenviar em \d:\d{2}/).waitFor();
      await page.getByRole('button', { name: 'Trocar e-mail' }).click();
      await page.getByRole('button', { name: 'Digitar código recebido' }).click();
      assert(await resend.isDisabled(), 'Voltar para o mesmo e-mail deve preservar a espera.');

      // Avança o relógio do navegador e a reserva atual da fixture no banco local.
      await page.clock.fastForward(121_000);
      assert(await resend.isEnabled(), 'O reenvio deve ficar disponível após dois minutos.');
      execFileSync('docker', ['exec', '-i', 'cali-oneshot-qa-db-1', 'psql', '-U', 'cali_restore_admin', '-d', 'postgres', '-Xq', '-v', 'ON_ERROR_STOP=1', '-v', `qa_email=${email}`], {
        input: `update cali_workspace.workspace_access_codes
          set created_at = created_at - interval '121 seconds'
          where email = :'qa_email' and delivered_at is not null and used_at is null
            and created_at > clock_timestamp() - interval '2 minutes';`,
      });
      const retrySince = Date.now() - 1000;
      const retry = page.waitForResponse((response) => response.url() === `${api}/functions/v1/workspace-access`);
      await resend.click();
      assert((await retry).ok(), 'O reenvio falhou no Edge local.');
      access = await latestCode(email, retrySince, access.messageId);
      assert(await resend.isDisabled(), 'O novo pedido deve reiniciar a espera.');
    }
    await page.getByLabel('Código de acesso').fill(access.code);
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
  const authHeaders = ['apikey', 'authorization', 'x-client-info', 'x-supabase-api-version'];
  const preflight = await fetch(`${api}/auth/v1/user`, {
    method: 'OPTIONS',
    headers: {
      Origin: app,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': authHeaders.join(', '),
    },
    signal: AbortSignal.timeout(4000),
  });
  assert.equal(preflight.status, 204, 'Preflight do Supabase Auth local indisponível.');
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), app);
  const allowed = preflight.headers.get('Access-Control-Allow-Headers')?.toLowerCase().split(/,\s*/) ?? [];
  for (const header of authHeaders) assert(allowed.includes(header), `CORS do Auth local bloqueia ${header}.`);
  const proxy = await denyProxy();
  let browser;
  try {
    browser = await launchBrowser(defaultChrome(), proxy);
    await verifyCompany(browser, { email: 'cliente-a2@example.test', own: 'Ocorrência legada A QA', other: 'Ocorrência legada B QA', checkResend: true });
    await verifyCompany(browser, { email: 'cliente-b@example.test', own: 'Ocorrência legada B QA', other: 'Ocorrência legada A QA' });
    console.log('PASS Playwright local · OTP e reenvio no Mailpit, termos, duas empresas, ocorrência legada e logout');
  } finally {
    await closeBrowser(browser);
    await proxy.close();
  }
});
