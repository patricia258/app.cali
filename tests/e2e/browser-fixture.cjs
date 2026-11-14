'use strict';

const { user, tables, readRpcs, companyId, termsVersion, termsHash } = require('./fixtures.cjs');

const expiry = 4070908800;
const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const authOrigin = 'https://cali-local-qa.supabase.co';
const sessionKey = 'sb-cali-local-qa-auth-token';
const factorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const challengeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const fixtureCode = '123456';
const authUser = {
  ...user,
  factors: [{ id: factorId, factor_type: 'totp', friendly_name: 'Autenticador QA', status: 'verified' }],
};
function makeSession(aal = 'aal2') {
  const token =
    part({ alg: 'HS256', typ: 'JWT' }) +
    '.' +
    part({
      sub: user.id,
      session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      exp: expiry,
      aud: 'authenticated',
      role: 'authenticated',
      aal,
      amr: [{ method: aal === 'aal2' ? 'totp' : 'otp', timestamp: 1700000000 }],
    }) +
    '.c2ln';
  return {
    access_token: token,
    refresh_token: 'synthetic-fixture',
    expires_at: expiry,
    expires_in: 3600,
    token_type: 'bearer',
    user: authUser,
  };
}

const form = {
  id: 'qa-form-id',
  slug: 'qa-form',
  title: 'Formulário QA',
  category: 'CALI Forms',
  description: 'Fixture sintética',
  success_text: 'Recebemos sua resposta de teste.',
  status: 'open',
  confirm_email: false,
  created_at: '2026-10-08T13:00:00Z',
  updated_at: '2026-10-08T13:00:00Z',
  questions: [{ id: 'qa-name', kind: 'short_text', label: 'Seu nome', required: true }],
};
const modules = ['projects', 'records', 'hours', 'calendar', 'documents', 'reports', 'team', 'notices'];
function makeFixture(role) {
  const session = makeSession();
  const isPartner = role.startsWith('partner');
  const rows = structuredClone(tables);
  rows.profiles[0] = { ...rows.profiles[0], role: isPartner ? 'partner' : role };
  rows.staff_members = isPartner
    ? [
        {
          id: 'qa-staff',
          user_id: user.id,
          full_name: 'Partner QA',
          active: true,
          modules: role === 'partner' ? modules : ['hours'],
        },
      ]
    : [];
  rows.terms_acceptances = [{ user_id: user.id, version: termsVersion }];
  rows.forms = [form];
  rows.cali_submissions = [
    {
      id: 'qa-submission',
      protocol: 'CALI-PROP-QA',
      service_slug: 'assessoria-estrategica',
      status: 'analise',
      contact_name: 'Decisora QA',
      contact_email: 'decisor@example.invalid',
      company_name: 'Empresa QA fictícia',
      contact_role: 'Diretoria',
      answers: {},
      lgpd_accepted: true,
      created_at: '2026-10-15T12:00:00.000Z',
      updated_at: '2026-10-15T12:00:00.000Z',
    },
  ];
  rows.notices = [
    {
      id: 'qa-notice',
      protocol: 'QA-AVISO-001',
      category: 'comunicado',
      title: 'Comunicado QA',
      body: 'Comunicado sintético para validar a URL.',
      notice_date: '2026-11-15',
      time_label: null,
      coverage: null,
      cover_path: null,
      audience: 'all',
      status: 'published',
      published_at: '2026-10-15T12:00:00.000Z',
    },
  ];
  rows.company_fronts.push({
    id: 'qa-people-analytics',
    company_id: companyId,
    front_code: 'people_analytics',
    mode: 'addon',
    started_at: '2026-10-15',
    status: 'active',
    ends_at: null,
  });
  return { session, rows };
}

function matchingRows(rows, params) {
  return rows.filter((row) => {
    for (const [key, filter] of params) {
      if (!Object.hasOwn(row, key) || (typeof row[key] === 'object' && row[key] !== null)) continue;
      if (filter.startsWith('eq.') && String(row[key]) !== filter.slice(3)) return false;
      if (filter === 'is.null' && row[key] !== null) return false;
    }
    return true;
  });
}

async function makeContext(browser, origin, role, options = {}) {
  const { session, rows } = makeFixture(role);
  const blocked = new Set();
  const mocked = new Set();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
    ...options,
  });
  await context.addInitScript(
    ({ session, origin, role, sessionKey }) => {
      if (location.origin !== origin || sessionStorage.getItem('qa-route-init')) return;
      sessionStorage.setItem('qa-route-init', '1');
      localStorage.setItem(
        'cali-workspace-theme-override-v1',
        JSON.stringify({ theme: 'day', until: 4070908800000 }),
      );
      if (role === 'public') return;
      localStorage.setItem(sessionKey, JSON.stringify(session));
      localStorage.setItem('cali:welcome-seen:' + session.user.id, '2026-10-15T00:00:00Z');
    },
    { origin, role, session, sessionKey },
  );
  await context.routeWebSocket('**/*', (ws) => ws.close({ code: 1000, reason: 'QA fixture' }));
  await context.route(
    (url) => url.origin !== origin,
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === 'https://fonts.googleapis.com' && request.resourceType() === 'stylesheet') {
        mocked.add('external-font-stylesheet');
        return route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '/* QA offline */' });
      }
      if (url.origin !== authOrigin) {
        blocked.add(url.hostname || '(scheme local)');
        return route.abort('blockedbyclient');
      }
      const endpoint = url.pathname.split('/').at(-1);
      mocked.add(url.pathname);
      const method = request.method();
      const headers = {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET,HEAD,OPTIONS,POST,PATCH,DELETE',
        'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*',
        'access-control-expose-headers': 'content-range',
      };
      const json = (value, status = 200, extra = {}) =>
        route.fulfill({ json: value, status, headers: { ...headers, ...extra } });
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (url.pathname.startsWith('/auth/v1/')) {
        if (endpoint === 'user')
          return role === 'public' ? json({ message: 'Sessão ausente' }, 401) : json(authUser);
        if (endpoint === 'logout') return route.fulfill({ status: 204, headers });
        if (url.pathname === '/auth/v1/factors/' + factorId + '/challenge' && method === 'POST') {
          return json({ id: challengeId, type: 'totp', expires_at: expiry });
        }
        if (url.pathname === '/auth/v1/factors/' + factorId + '/verify' && method === 'POST') {
          const data = request.postDataJSON();
          return data?.challenge_id === challengeId && data.code === fixtureCode
            ? json(session)
            : json({ message: 'Código de teste inválido' }, 403);
        }
        if (endpoint === 'verify' || endpoint === 'token') {
          return role === 'public' ? json({ message: 'Código de teste inválido' }, 403) : json(session);
        }
        return json({ message: 'Operação Auth fora do cenário de rota' }, 403);
      }
      if (url.pathname.startsWith('/functions/v1/')) {
        if (endpoint === 'google-drive-oauth' || endpoint === 'google-calendar-oauth') {
          const body = request.postDataJSON();
          if (body?.action === 'exchange' && body.code === 'qa-code')
            return json({ connected: true, accountEmail: 'qa@example.invalid' });
        }
        return json({ connected: false, jobs: [], events: [] });
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        if (endpoint === 'v2_read_terms_state')
          return json({ version: termsVersion, contentHash: termsHash, accepted: true });
        if (endpoint === 'partner_companies') return json(role.startsWith('partner') ? rows.companies : []);
        if (endpoint === 'read_client_account_responsibles')
          return json({
            executive: {
              full_name: 'Patrícia Lima',
              job_title: 'People Advisory Executive',
              avatar_url: null,
              avatar_position_x: null,
              avatar_position_y: null,
              avatar_zoom: null,
            },
            supportPartner: { full_name: 'Apoio QA' },
          });
        if (endpoint === 'cali_form_public')
          return json(request.postDataJSON()?.p_slug === 'qa-form' ? form : null);
        if (endpoint === 'cali_profile_link') {
          return json(
            request.postDataJSON()?.p_slug === 'qa-disc'
              ? { id: 'qa-disc-id', slug: 'qa-disc', title: 'DISC QA', status: 'open' }
              : null,
          );
        }
        if (endpoint === 'cali_profile_invite_open' || endpoint === 'cali_profile_report') return json(null);
        if (endpoint === 'get_client_contract_fronts') return json([]);
        if (Object.hasOwn(readRpcs, endpoint)) return json(readRpcs[endpoint]);
        return json({ message: 'RPC fora do cenário de rota' }, 403);
      }
      if (url.pathname.startsWith('/rest/v1/') && ['GET', 'HEAD'].includes(method)) {
        const list = matchingRows(rows[endpoint] || [], url.searchParams);
        const single = request.headers().accept?.includes('vnd.pgrst.object');
        const range = { 'content-range': list.length ? '0-' + (list.length - 1) + '/' + list.length : '*/0' };
        if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...headers, ...range } });
        return json(single ? (list[0] ?? null) : list, 200, range);
      }
      return json({ message: 'Escrita ou endpoint fora do cenário de rota' }, 403);
    },
  );
  return { context, blocked, mocked };
}

const relative = (absolute) => {
  const url = new URL(absolute);
  return url.pathname + url.search + url.hash;
};
module.exports = { makeContext, makeSession, relative, part, factorId, fixtureCode, sessionKey };
