'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { defaultChrome, serve, denyProxy, launchBrowser, closeBrowser, finishCli } = require('./loopback.cjs');
const { checkBrowserResources } = require('./browser-resources.cjs');
const {
  user,
  tables,
  readRpcs,
  termsVersion: currentTermsVersion,
  termsHash: currentTermsHash,
} = require('./fixtures.cjs');

const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: path.resolve('dist') },
    chrome: { type: 'string', default: process.env.CALI_E2E_CHROME || defaultChrome() },
    output: { type: 'string' },
    'auth-ref': { type: 'string', default: 'cali-local-qa' },
    'terms-version': { type: 'string', default: currentTermsVersion },
    'terms-hash': { type: 'string', default: currentTermsHash },
    case: { type: 'string', multiple: true },
    list: { type: 'boolean', default: false },
  },
});
assert(/^[a-z0-9-]+$/.test(values['auth-ref']));
assert(/^[a-f0-9]{64}$/.test(values['terms-hash']));
const authOrigin = 'https://' + values['auth-ref'] + '.supabase.co';
const sessionKey = 'sb-' + values['auth-ref'] + '-auth-token';
const termsVersion = values['terms-version'];
const termsHash = values['terms-hash'];
const timeout = 6000;
const expiry = 4070908800;
const code = '123456';
const sessionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const factor = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  factor_type: 'totp',
  friendly_name: 'QA sintético',
  status: 'verified',
  created_at: '2026-10-15T00:00:00Z',
  updated_at: '2026-10-15T00:00:00Z',
};
const challengeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const replacementUser = { ...user, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' };
const challengePath = '/auth/v1/factors/' + factor.id + '/challenge';
const verifyPath = '/auth/v1/factors/' + factor.id + '/verify';
const readTermsPath = '/rest/v1/rpc/v2_read_terms_state';
const acceptTermsPath = '/rest/v1/rpc/v2_accept_terms';
const legacyTermsPath = '/rest/v1/terms_acceptances';
const printPath = '/equipe/relatorios/impressao/qa-report';
const staffPath = '/rest/v1/staff_members';
const companiesPath = '/rest/v1/rpc/partner_companies';
const publicPartnerPaths = new Set(['/rest/v1/profiles', legacyTermsPath, readTermsPath]);
const gateError = '[data-access-gate] [role=alert]';
const adminMarker = '#root .ap-app';
const clientMarker = '#root h1';
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const profileAvatarPath = '/storage/v1/object/sign/cali-workspace-private/qa-guards/avatar.svg';
const isIdentityQuery = (url) =>
  url.pathname === '/rest/v1/profiles' &&
  url.searchParams.get('id')?.startsWith('eq.') &&
  url.searchParams.get('select')?.split(',').includes('avatar_url');

const cases = [
  {
    id: 'mfa:assurance-malformed',
    role: 'admin',
    malformed: true,
    expected: 'mfa-error',
    probe: '/auth/v1/user',
    probeStatus: 401,
  },
  { id: 'mfa:auth-endpoint-error', role: 'admin', userError: true, expected: 'mfa-error', probe: '/auth/v1/user' },
  {
    id: 'mfa:aal2-auth-endpoint-error',
    role: 'admin',
    aal: 'aal2',
    userError: true,
    expected: 'mfa-error',
    probe: '/auth/v1/user',
  },
  { id: 'mfa:missing-aal', role: 'admin', aal: null, expected: 'mfa-gate' },
  {
    id: 'mfa:enroll-endpoint-error',
    role: 'admin',
    noFactors: true,
    enrollError: true,
    expected: 'mfa-error',
    probe: '/auth/v1/factors',
  },
  { id: 'mfa:first-enrollment', role: 'admin', noFactors: true, expected: 'mfa-enroll' },
  { id: 'mfa:verify-accepted', role: 'admin', expected: 'mfa-verify' },
  {
    id: 'mfa:challenge-rejected',
    role: 'admin',
    challengeError: true,
    expected: 'mfa-rejected',
    rejectedPath: challengePath,
  },
  {
    id: 'mfa:verify-rejected',
    role: 'admin',
    verifyError: true,
    expected: 'mfa-rejected',
    rejectedPath: verifyPath,
  },
  {
    id: 'mfa:verify-without-aal2',
    role: 'admin',
    verifiedAal: 'aal1',
    expected: 'mfa-rejected',
    rejectedPath: verifyPath,
  },
  { id: 'mfa:already-aal2', role: 'admin', aal: 'aal2', expected: 'admitted' },
  {
    id: 'mfa:aal2-unverified-factor',
    role: 'admin',
    aal: 'aal2',
    noFactors: true,
    expected: 'mfa-enroll-blocked',
  },
  { id: 'mfa:same-actor-replaced-session', role: 'admin', aal: 'aal2', expected: 'mfa-session-replaced' },
  { id: 'terms:rpc-error', role: 'client', termsReadError: true, expected: 'terms-error' },
  {
    id: 'terms:published-version-mismatch',
    role: 'client',
    versionMismatch: true,
    accepted: true,
    expected: 'terms-error',
  },
  {
    id: 'terms:published-hash-mismatch',
    role: 'client',
    hashMismatch: true,
    accepted: true,
    expected: 'terms-error',
  },
  { id: 'terms:unaccepted-confirm-reload', role: 'client', expected: 'terms-confirm' },
  { id: 'terms:first-access-before-tour', role: 'client', tourUnseen: true, expected: 'terms-confirm' },
  { id: 'terms:accept-error', role: 'client', termsAcceptError: true, expected: 'terms-rejected' },
  { id: 'terms:ack-without-receipt', role: 'client', noTermsReceipt: true, expected: 'terms-rejected' },
  { id: 'terms:already-accepted', role: 'client', accepted: true, expected: 'admitted' },
  { id: 'terms:admin-after-mfa-error', role: 'admin', aal: 'aal2', termsReadError: true, expected: 'terms-error' },
  { id: 'terms:admin-after-mfa-confirm', role: 'admin', aal: 'aal2', expected: 'terms-confirm' },
  {
    id: 'terms:partner-legacy-error',
    role: 'partner',
    aal: 'aal2',
    termsReadError: true,
    expected: 'terms-error',
  },
  { id: 'terms:partner-legacy-confirm', role: 'partner', aal: 'aal2', expected: 'terms-confirm' },
  { id: 'terms:partner-legacy-accepted', role: 'partner', aal: 'aal2', accepted: true, expected: 'admitted' },
  { id: 'terms:client-actor-replaced', role: 'client', accepted: true, expected: 'terms-actor-replaced' },
  { id: 'staff:aal1-enroll-before-private', role: 'partner', noFactors: true, expected: 'staff-mfa' },
  { id: 'staff:aal1-verify-before-private', role: 'partner', expected: 'staff-mfa' },
  {
    id: 'staff:print-authorized',
    role: 'partner',
    aal: 'aal2',
    accepted: true,
    reportsModule: true,
    print: true,
    expected: 'staff-print',
  },
  {
    id: 'staff:print-module-denied',
    role: 'partner',
    aal: 'aal2',
    accepted: true,
    print: true,
    expected: 'staff-no-print',
  },
  {
    id: 'staff:print-terms-denied',
    role: 'partner',
    aal: 'aal2',
    termsReadError: true,
    reportsModule: true,
    print: true,
    expected: 'terms-error',
  },
].filter((test) => !values.case || values.case.some((fragment) => test.id.includes(fragment)));

function session(aal, factors, malformed = false, id = sessionId, actor = user) {
  const payload = { sub: actor.id, session_id: id, exp: expiry, aud: 'authenticated', role: 'authenticated' };
  if (aal !== null) payload.aal = aal;
  const accessToken = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64(payload) + '.' + (malformed ? '*' : 'c2ln');
  return {
    access_token: accessToken,
    refresh_token: 'qa-synthetic',
    expires_at: expiry,
    expires_in: 3600,
    token_type: 'bearer',
    user: { ...actor, factors },
  };
}

function filterRows(rows, params) {
  return rows.filter((row) => {
    for (const [key, filter] of params) {
      if (!Object.hasOwn(row, key) || (typeof row[key] === 'object' && row[key] !== null)) continue;
      if (filter.startsWith('eq.') && String(row[key]) !== filter.slice(3)) return false;
      if (filter === 'is.null' && row[key] !== null) return false;
    }
    return true;
  });
}

async function mock(browser, origin, test) {
  const initialAal = Object.hasOwn(test, 'aal') ? test.aal : 'aal1';
  const initialFactors = test.noFactors ? [] : [factor];
  const initial = session(initialAal, initialFactors, test.malformed);
  let factors = initialFactors;
  let accepted = Boolean(test.accepted) || (test.role === 'admin' && test.id.startsWith('mfa:'));
  const requests = [];
  const staffBoundary = test.id.startsWith('staff:');
  let receiptConfirmed = false;
  const rows = structuredClone(tables);
  rows.profiles[0] = { ...rows.profiles[0], role: test.role, avatar_url: 'private:qa-guards/avatar.svg' };
  if (test.expected === 'terms-actor-replaced') {
    rows.profiles.push({ ...rows.profiles[0], id: replacementUser.id });
  }
  rows.staff_members = [
    {
      id: 'qa-staff',
      user_id: user.id,
      full_name: 'Partner QA',
      active: true,
      modules: test.reportsModule ? ['hours', 'reports'] : ['hours'],
    },
  ];
  const context = await browser.newContext({
    serviceWorkers: 'block',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(
    ({ origin, initial, sessionKey, tourUnseen }) => {
      if (location.origin !== origin || sessionStorage.getItem('guard-qa-initialized')) return;
      sessionStorage.setItem('guard-qa-initialized', '1');
      localStorage.setItem(sessionKey, JSON.stringify(initial));
      if (!tourUnseen) localStorage.setItem('cali:welcome-seen:' + initial.user.id, '2026-10-15T00:00:00Z');
    },
    { origin, initial, sessionKey, tourUnseen: test.tourUnseen },
  );
  await context.routeWebSocket('**/*', (socket) => socket.close({ code: 1000, reason: 'QA fixture' }));
  await context.route(
    (url) => url.origin !== origin,
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === 'https://fonts.googleapis.com' && request.resourceType() === 'stylesheet') {
        return route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '/* QA offline */' });
      }
      if (url.origin !== authOrigin) return route.abort('blockedbyclient');
      const endpoint = url.pathname.split('/').at(-1);
      const method = request.method();
      const entry = { method, path: url.pathname };
      requests.push(entry);
      const headers = {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET,HEAD,OPTIONS,POST,PATCH,DELETE',
        'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
        'access-control-expose-headers': 'content-range',
      };
      function fulfill(status, body, more = {}) {
        entry.status = status;
        return route.fulfill({
          status,
          ...(body === undefined ? {} : { json: body }),
          headers: { ...headers, ...more },
        });
      }
      if (method === 'OPTIONS') return fulfill(204);
      if ((method === 'GET' && isIdentityQuery(url)) || url.pathname === profileAvatarPath) entry.identity = true;
      if (url.pathname === profileAvatarPath) {
        if (method === 'POST') return fulfill(200, { signedURL: profileAvatarPath.replace('/storage/v1', '') + '?token=qa-guards' });
        return route.fulfill({ headers, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#723043"/></svg>' });
      }
      if (staffBoundary && url.pathname === '/rest/v1/reports' && url.searchParams.get('id') === 'eq.qa-report') {
        entry.printReport = true;
      }
      if (staffBoundary && url.pathname.startsWith('/rest/v1/') && !publicPartnerPaths.has(url.pathname)) {
        entry.private = true;
        const jwtPayload = request.headers().authorization?.split('.')[1];
        const claims = jwtPayload && JSON.parse(Buffer.from(jwtPayload, 'base64url').toString('utf8'));
        entry.beforeMfa = claims?.aal !== 'aal2' || !factors.some((item) => item.status === 'verified');
        entry.beforeTerms = !receiptConfirmed;
        if (entry.beforeMfa || entry.beforeTerms) {
          return fulfill(403, { message: 'Consulta privada antes de MFA e termos' });
        }
      }
      if (url.pathname === '/auth/v1/user') {
        if (request.headers().authorization?.endsWith('.*'))
          return fulfill(401, { message: 'Assinatura inválida na fixture' });
        return test.userError
          ? fulfill(503, { message: 'Falha Auth simulada' })
          : fulfill(200, { ...user, factors });
      }
      if (url.pathname === '/auth/v1/factors' && method === 'POST') {
        if (test.enrollError) return fulfill(503, { message: 'Falha cadastro de fator simulada' });
        factors = [{ ...factor, status: 'unverified' }];
        return fulfill(200, {
          id: factor.id,
          type: 'totp',
          totp: {
            qr_code:
              '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12"/></svg>',
            secret: 'QA-SYNTHETIC-SECRET',
            uri: 'otpauth://totp/qa',
          },
        });
      }
      if (url.pathname === challengePath && method === 'POST') {
        return test.challengeError
          ? fulfill(503, { message: 'Falha desafio simulada' })
          : fulfill(200, { id: challengeId, type: 'totp', expires_at: expiry });
      }
      if (url.pathname === verifyPath && method === 'POST') {
        const body = request.postDataJSON();
        if (test.verifyError || body?.challenge_id !== challengeId || body.code !== code) {
          return fulfill(403, { message: 'Código QA recusado' });
        }
        factors = [factor];
        return fulfill(200, session(test.verifiedAal || 'aal2', factors));
      }
      if (url.pathname === '/auth/v1/logout') return fulfill(204);
      if (url.pathname === readTermsPath) {
        if (test.termsReadError && test.role !== 'partner')
          return fulfill(503, { message: 'Falha leitura de termos simulada' });
        const claims = test.expected === 'terms-actor-replaced'
          ? JSON.parse(Buffer.from(request.headers().authorization.split('.')[1], 'base64url').toString('utf8'))
          : null;
        return fulfill(200, {
          version: test.versionMismatch ? 'qa-versao-divergente' : termsVersion,
          contentHash: test.hashMismatch ? '0'.repeat(64) : termsHash,
          accepted: accepted && claims?.sub !== replacementUser.id,
        });
      }
      if (url.pathname === acceptTermsPath) {
        const body = request.postDataJSON();
        entry.matchesPublication = body?.p_version === termsVersion && body.p_content_hash === termsHash;
        if (!entry.matchesPublication) return fulfill(422, { message: 'Publicação QA divergente' });
        if (test.termsAcceptError) return fulfill(503, { message: 'Falha de aceite simulada' });
        if (!test.noTermsReceipt) accepted = true;
        return fulfill(200, null);
      }
      if (url.pathname === legacyTermsPath) {
        if (test.role === 'partner') {
          if (method === 'GET') {
            if (test.termsReadError)
              return fulfill(403, { message: 'Leitura do recibo legado recusada na fixture' });
            if (accepted) {
              receiptConfirmed = true;
              if (staffBoundary) entry.receiptConfirmed = true;
            }
            const receipt = { user_id: user.id, version: termsVersion };
            const single = request.headers().accept?.includes('vnd.pgrst.object');
            return fulfill(200, single ? (accepted ? receipt : null) : accepted ? [receipt] : []);
          }
          if (method === 'POST') {
            const body = request.postDataJSON();
            entry.matchesPublication = body?.user_id === user.id && body.version === termsVersion;
            if (!entry.matchesPublication) return fulfill(422, { message: 'Versão ou ator QA divergentes' });
            accepted = true;
            return fulfill(201);
          }
        }
        return fulfill(403, { message: 'Aceite direto não faz parte do cenário QA' });
      }
      if (url.pathname.startsWith('/functions/v1/'))
        return fulfill(200, { connected: false, jobs: [], events: [] });
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        if (endpoint === 'partner_companies' && test.role === 'partner') return fulfill(200, rows.companies);
        if (Object.hasOwn(readRpcs, endpoint)) return fulfill(200, readRpcs[endpoint]);
        return fulfill(403, { message: 'RPC fora do cenário QA' });
      }
      if (url.pathname.startsWith('/rest/v1/') && ['GET', 'HEAD'].includes(method)) {
        const found = filterRows(rows[endpoint] || [], url.searchParams);
        const range = { 'content-range': found.length ? '0-' + (found.length - 1) + '/' + found.length : '*/0' };
        if (method === 'HEAD') return fulfill(200, undefined, range);
        const single = request.headers().accept?.includes('vnd.pgrst.object');
        return fulfill(200, single ? (found[0] ?? null) : found, range);
      }
      return fulfill(403, { message: 'Endpoint fora do cenário QA' });
    },
  );
  return { context, requests };
}

const recorded = (requests, requestPath, status) =>
  requests.some(
    (entry) =>
      entry.path === requestPath &&
      entry.method !== 'OPTIONS' &&
      (status === undefined || entry.status === status),
  );
async function adminDenied(page) {
  assert.equal(await page.locator(adminMarker).count(), 0, 'Dashboard Admin abriu antes do MFA');
}
async function clientDenied(page) {
  assert.equal(await page.getByRole('heading', { name: /^Olá/ }).count(), 0, 'Home Cliente abriu antes do aceite');
}
async function deniedByTerms(page, role) {
  if (role === 'admin') {
    await adminDenied(page);
  } else if (role === 'partner') {
    assert.equal(
      await page.getByRole('heading', { name: /^Visão geral/ }).count(),
      0,
      'Home Partner abriu antes do aceite',
    );
  } else {
    await clientDenied(page);
  }
}
async function assertAdmitted(page, test) {
  if (test.role === 'admin') {
    await page.locator(adminMarker).waitFor({ timeout });
  } else if (test.role === 'partner') {
    await page.getByRole('heading', { name: /^Visão geral/ }).waitFor({ timeout });
  } else {
    await page.locator(clientMarker).filter({ hasText: /^Olá/ }).waitFor({ timeout });
  }
  assert.equal(await page.locator('.v2-mfa:visible').count(), 0, 'Guarda ainda bloqueia o conteúdo');
}

async function waitForIdentityStartup(page) {
  await page.evaluate(() => new Promise((resolve) => window.setTimeout(resolve, 1100)));
}

async function replaceSession(page, replacement) {
  await page.evaluate(({ sessionKey, replacement }) => {
    localStorage.setItem(sessionKey, JSON.stringify(replacement));
    const channel = new BroadcastChannel(sessionKey);
    channel.postMessage({ event: 'SIGNED_IN', session: replacement });
    channel.close();
  }, { sessionKey, replacement });
}

async function assertIdentitySuspended(page, requests, from) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('cali-profile-updated'));
  });
  await waitForIdentityStartup(page);
  assert(!requests.slice(from).some((entry) => entry.identity), 'Identidade consultada depois de perder a guarda');
}

const profileAvatarVisible = (page) => page.locator('img[src*="qa-guards/avatar.svg?token=qa-guards"]').first().waitFor({ timeout });

async function verifyMfa(page, test, requests) {
  const input = page.getByLabel('Código do aplicativo');
  await input.waitFor({ timeout });
  await deniedByTerms(page, test.role);
  if (test.expected === 'staff-mfa') {
    await waitForIdentityStartup(page);
    assert(!requests.some((entry) => entry.private), 'MFA pendente iniciou consultas privadas');
    assert(!recorded(requests, legacyTermsPath), 'Termos foram consultados antes do MFA');
  }
  if (test.noFactors && !test.enrollError) {
    await page.getByRole('heading', { name: /Ative a verificação/ }).waitFor({ timeout });
    await page.getByRole('img', { name: /QR code/ }).waitFor({ timeout });
    assert(recorded(requests, '/auth/v1/factors', 200), 'Endpoint de enrollment não consultado');
  }
  await input.fill(code);
  const expectedPath = test.rejectedPath || verifyPath;
  const [response] = await Promise.all([
    page.waitForResponse(
      (value) => new URL(value.url()).pathname === expectedPath && value.request().method() === 'POST',
      { timeout },
    ),
    page.getByRole('button', { name: 'Confirmar', exact: true }).click({ timeout }),
  ]);
  if (test.expected === 'mfa-rejected') {
    assert.equal(response.status(), test.challengeError ? 503 : test.verifyError ? 403 : 200);
    await page.locator(gateError).waitFor({ timeout });
    await adminDenied(page);
  } else if (test.expected === 'staff-mfa') {
    assert.equal(response.status(), 200);
    await page.getByRole('checkbox', { name: /Li e aceito/ }).waitFor({ timeout });
    assert(!requests.some((entry) => entry.private), 'Termos pendentes iniciaram consultas privadas');
    await verifyTerms(page, test, requests);
  } else {
    assert.equal(response.status(), 200);
    await assertAdmitted(page, test);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertAdmitted(page, test);
  }
}

async function verifyTerms(page, test, requests) {
  const checkbox = page.getByRole('checkbox', { name: /Li e aceito/ });
  await checkbox.waitFor({ timeout });
  await deniedByTerms(page, test.role);
  await waitForIdentityStartup(page);
  assert(!requests.some((entry) => entry.identity), 'Termos pendentes iniciaram a identidade privada');
  const button = page.getByRole('button', { name: 'Continuar', exact: true });
  assert(await button.isDisabled(), 'Continuar habilitado antes do aceite explícito');
  await checkbox.check({ timeout });
  const submitPath = test.role === 'partner' ? legacyTermsPath : acceptTermsPath;
  const receiptPath = test.role === 'partner' ? legacyTermsPath : readTermsPath;
  const receiptRead = (entry) =>
    entry.path === receiptPath &&
    entry.method !== 'OPTIONS' &&
    (test.role !== 'partner' || entry.method === 'GET');
  const [response] = await Promise.all([
    page.waitForResponse(
      (value) => new URL(value.url()).pathname === submitPath && value.request().method() === 'POST',
      { timeout },
    ),
    button.click({ timeout }),
  ]);
  assert.equal(response.status(), test.termsAcceptError ? 503 : test.role === 'partner' ? 201 : 200);
  const submitIndex = requests.findIndex((entry) => entry.path === submitPath && entry.method === 'POST');
  assert(submitIndex >= 0 && requests[submitIndex].matchesPublication, 'Aceite não enviou versão e hash exatos');
  if (test.expected === 'terms-rejected') {
    await page.locator(gateError).waitFor({ timeout });
    await deniedByTerms(page, test.role);
  } else {
    await Promise.all([assertAdmitted(page, test), profileAvatarVisible(page)]);
    const afterSubmit = requests.slice(submitIndex + 1);
    const receiptIndex = afterSubmit.findIndex(receiptRead);
    const signatureIndex = afterSubmit.findIndex((entry) => entry.path === profileAvatarPath && entry.method === 'POST');
    assert(receiptIndex >= 0 && signatureIndex > receiptIndex, 'Foto privada deve ser assinada depois de reler o recibo');
    if (test.tourUnseen) {
      const tour = page.getByRole('dialog', { name: 'Apresentação do CALI Workspace' });
      await tour.waitFor({ timeout });
      await tour.getByRole('button', { name: 'Pular', exact: true }).click({ timeout });
    }
    const reads = requests.filter(receiptRead).length;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertAdmitted(page, test);
    assert(requests.filter(receiptRead).length > reads, 'Reload não releu a publicação');
  }
}

async function runCase(browser, origin, test) {
  const { context, requests } = await mock(browser, origin, test);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message.split('\n')[0]));
  const start = Date.now();
  let outcome;
  try {
    const home = { admin: '/admin', client: '/cliente', partner: '/equipe' }[test.role];
    await page.goto(origin + (test.print ? printPath : home), { waitUntil: 'domcontentloaded' });
    if (test.expected === 'mfa-error') {
      await page.locator(gateError).waitFor({ timeout });
      await adminDenied(page);
      if (test.probe)
        assert(recorded(requests, test.probe, test.probeStatus || 503), 'Falha de endpoint QA não exercitada');
    } else if (test.expected === 'mfa-gate') {
      await page.getByRole('heading', { name: /verificação em duas etapas/i }).waitFor({ timeout });
      await adminDenied(page);
    } else if (test.expected === 'mfa-enroll-blocked') {
      await page.getByRole('heading', { name: /Ative a verificação/ }).waitFor({ timeout });
      assert(recorded(requests, '/auth/v1/factors', 200));
      await adminDenied(page);
    } else if (test.expected === 'mfa-session-replaced') {
      await Promise.all([assertAdmitted(page, test), profileAvatarVisible(page)]);
      const replacement = session('aal1', [factor], false, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
      const beforeReplacement = requests.length;
      await replaceSession(page, replacement);
      await page.getByLabel('Código do aplicativo').waitFor({ timeout });
      await adminDenied(page);
      await assertIdentitySuspended(page, requests, beforeReplacement);
    } else if (test.expected === 'terms-actor-replaced') {
      await Promise.all([assertAdmitted(page, test), profileAvatarVisible(page)]);
      const beforeReplacement = requests.length;
      await replaceSession(page, session('aal1', [], false, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', replacementUser));
      await page.getByRole('checkbox', { name: /Li e aceito/ }).waitFor({ timeout });
      await clientDenied(page);
      await assertIdentitySuspended(page, requests, beforeReplacement);
    } else if (test.expected === 'terms-error') {
      await page.locator(gateError).waitFor({ timeout });
      await deniedByTerms(page, test.role);
      assert.equal(
        await page.getByRole('checkbox', { name: /Li e aceito/ }).count(),
        0,
        'Guarda exibiu aceite de termos divergentes',
      );
    } else if (test.expected === 'admitted') {
      await assertAdmitted(page, test);
    } else if (test.expected === 'staff-print') {
      await page.getByRole('button', { name: 'Imprimir / salvar PDF' }).waitFor({ timeout });
      assert.equal(new URL(page.url()).pathname, printPath);
      assert(
        requests.some((entry) => entry.printReport && entry.status === 200),
        'Impressão não carregou o relatório',
      );
    } else if (test.expected === 'staff-no-print') {
      await page.waitForURL((url) => url.pathname === home, { timeout });
      await assertAdmitted(page, test);
      assert(!requests.some((entry) => entry.printReport), 'Impressão sem módulo consultou o relatório');
    } else if (test.id.startsWith('mfa:') || test.expected === 'staff-mfa') {
      await verifyMfa(page, test, requests);
    } else {
      await verifyTerms(page, test, requests);
    }
    if (test.id.startsWith('terms:') && test.role !== 'partner') {
      assert(recorded(requests, readTermsPath), 'A guarda não consultou a publicação');
      assert(!recorded(requests, legacyTermsPath), 'A guarda usou acesso legado a termos');
    } else if (test.role === 'partner') {
      assert(recorded(requests, legacyTermsPath), 'A guarda Partner não consultou recibo legado');
    }
    if (test.id.startsWith('staff:')) {
      const privateRequests = requests.filter((entry) => entry.private);
      const premature = privateRequests.filter((entry) => entry.beforeMfa || entry.beforeTerms);
      assert.deepEqual(premature, [], 'Houve consultas privadas antes de MFA e termos');
      if (test.termsReadError) {
        assert.deepEqual(privateRequests, [], 'Termos recusados iniciaram consultas privadas');
        assert.equal(await page.getByRole('button', { name: 'Imprimir / salvar PDF' }).count(), 0);
      } else {
        assert(recorded(requests, staffPath, 200), 'Staff não carregou permissões após liberar as guardas');
        assert(recorded(requests, companiesPath, 200), 'Staff não carregou empresas após liberar as guardas');
      }
    }
    assert.equal(await page.locator('.workspace-fatal-fallback').count(), 0, 'Fallback fatal do Workspace');
    assert.deepEqual(pageErrors, [], 'Erro de JavaScript na guarda');
    outcome = { passed: true };
  } catch (error) {
    const heading = await page
      .locator('h1:visible')
      .first()
      .textContent({ timeout: 500 })
      .catch(() => null);
    outcome = { passed: false, reason: error.message.split('\n')[0], heading };
  } finally {
    await context.close();
  }
  return { id: test.id, ...outcome, durationMs: Date.now() - start, requests, pageErrors };
}

async function main() {
  assert(cases.length, 'Nenhum cenário selecionado');
  if (values.list) {
    console.log(
      JSON.stringify(
        cases.map((test) => test.id),
        null,
        2,
      ),
    );
    return;
  }
  assert(values.output, '--output obrigatório');
  const proxy = await denyProxy();
  let server;
  let browser;
  try {
    server = await serve(values.dist);
    const results = [];
    for (const [index, test] of cases.entries()) {
      checkBrowserResources();
      if (index % 4 === 0) {
        await closeBrowser(browser);
        browser = await launchBrowser(values.chrome, proxy);
      }
      console.error(JSON.stringify({ id: test.id, progress: 'start' }));
      const result = await runCase(browser, server.origin, test);
      console.error(JSON.stringify({ progress: 'end', ...result, requests: undefined }));
      results.push(result);
    }
    const summary = { passes: results.filter((result) => result.passed).length, total: results.length };
    await fs.writeFile(values.output, JSON.stringify({ ...summary, results }, null, 2) + '\n');
    console.log(JSON.stringify({ ...summary, output: values.output }));
    if (summary.passes !== summary.total) process.exitCode = 1;
  } finally {
    server?.close();
    proxy.close();
    await closeBrowser(browser);
  }
}

finishCli(main);
