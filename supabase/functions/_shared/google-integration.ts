import type { JsonObject, JsonValue } from './json.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

export const env = (name: string) => (Deno.env.get(name) || '').trim();
const values = (name: string) => env(name).split(',').map(value => value.trim()).filter(Boolean);
const providerOrigins = new Set([
  'https://accounts.google.com', 'https://oauth2.googleapis.com',
  'https://openidconnect.googleapis.com', 'https://www.googleapis.com', 'https://meet.googleapis.com',
]);
const encoder = new TextEncoder();
const productionProject = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const productionOrigin = 'https://app.calirh.com';

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function parseBase64Json(encoded: string) {
  const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(normalized), byte => byte.charCodeAt(0))));
}

export class GoogleIntegrationError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function googleRequest(request: Request) {
  const mode = env('CALI_GOOGLE_MODE');
  const redirect = env('GOOGLE_REDIRECT_URI');
  let callback: URL | null = null;
  try {
    const candidate = new URL(redirect);
    if (candidate.pathname === '/oauth/google/callback' && !candidate.search && !candidate.hash &&
      !candidate.username && !candidate.password &&
      (candidate.protocol === 'https:' || (mode === 'local' && candidate.origin === 'http://127.0.0.1:56430'))) {
      callback = candidate;
    }
  } catch { /* Configuração ausente ou inválida. */ }
  const allowlist = values('GOOGLE_ALLOWED_ORIGINS');
  const origin = request.headers.get('Origin');
  const allowed = !origin || (mode === 'live' ? origin === productionOrigin
    : origin !== productionOrigin && (allowlist.length ? allowlist.includes(origin) : callback?.origin === origin));
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
  const json = (data: JsonValue, status = 200) => new Response(JSON.stringify(data), { status, headers });
  const clientId = env('GOOGLE_CLIENT_ID');
  const clientSecret = env('GOOGLE_CLIENT_SECRET');
  const localProvider = env('GOOGLE_LOCAL_PROVIDER_URL');
  const localAuthorize = env('GOOGLE_LOCAL_AUTHORIZE_URL');
  const deliveryMode = env('CALI_DELIVERY_MODE');
  const project = env('SUPABASE_URL').replace(/\/$/, '');
  const localReady = deliveryMode === 'isolated' && localProvider === 'http://google-qa:9000' &&
    localAuthorize === 'http://127.0.0.1:56433' && project === 'http://ingress:56431';
  const testReady = deliveryMode === 'isolated' && /^https:\/\/[a-z0-9-]+[.]supabase[.]co$/.test(project) &&
    project !== productionProject && values('GOOGLE_TEST_ACCOUNTS').length > 0 &&
    callback?.origin !== productionOrigin && callback?.origin === env('CALI_DELIVERY_APP_ORIGIN');
  const liveReady = deliveryMode === 'production' && project === productionProject && callback?.origin === productionOrigin;
  const configured = Boolean(clientId && clientSecret && callback &&
    (mode === 'local' ? localReady : mode === 'test' ? testReady : mode === 'live' && liveReady));

  return {
    mode, origin, callback, allowed, headers, json, configured, clientId, clientSecret,
    reject(): Response | null {
      if (!allowed) return json({ error: 'origin_not_allowed' }, 403);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
      return null;
    },
    assertCallback() {
      if (!configured || !callback || origin !== callback.origin) throw new GoogleIntegrationError('oauth_redirect_mismatch', 403);
      return callback.href;
    },
    assertAccount(email: string) {
      const normalized = String(email || '').trim().toLowerCase();
      if (!normalized || (mode === 'local' && !normalized.endsWith('@example.test')) ||
        (mode === 'test' && !values('GOOGLE_TEST_ACCOUNTS').map(item => item.toLowerCase()).includes(normalized))) {
        throw new GoogleIntegrationError('google_account_not_allowed', 403);
      }
    },
    calendarAllowed(calendar: string) {
      return mode !== 'test' || values('GOOGLE_TEST_CALENDARS').includes(calendar);
    },
    assertCalendar(calendar: string) {
      if (!this.calendarAllowed(calendar)) {
        throw new GoogleIntegrationError('google_calendar_not_allowed', 403);
      }
    },
    driveRoot() { return mode === 'test' ? env('GOOGLE_TEST_DRIVE_FOLDER') : ''; },
    invitations(emails: string[]) {
      if (mode !== 'live' && emails.some(email => !values('GOOGLE_TEST_ATTENDEES').includes(email.toLowerCase()))) {
        throw new GoogleIntegrationError('google_attendee_not_allowed', 403);
      }
      return mode === 'live' ? 'all' : 'none';
    },
    authorize(params: URLSearchParams) {
      const base = mode === 'local' ? localAuthorize : 'https://accounts.google.com';
      return base + '/o/oauth2/v2/auth?' + params.toString();
    },
    async fetch(url: string, options: RequestInit = {}) {
      if (!configured) throw new GoogleIntegrationError('google_oauth_not_configured', 503);
      const target = new URL(url);
      if (!providerOrigins.has(target.origin) || target.username || target.password) throw new GoogleIntegrationError('google_provider_not_allowed', 403);
      const endpoint = mode === 'local' ? localProvider + target.pathname + target.search : target.href;
      return fetch(endpoint, { ...options, redirect: 'error', signal: options.signal || AbortSignal.timeout(20_000) });
    },
  };
}

export async function googleActor(request: Request) {
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization)) {
    throw new GoogleIntegrationError('missing_authorization', 401);
  }
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key || !serviceKey) throw new GoogleIntegrationError('integration_not_configured', 503);
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new GoogleIntegrationError('invalid_session', 401);
  const session = parseBase64Json(authorization.split('.')[1]).session_id;
  if (typeof session !== 'string' || !/^[a-f0-9-]{36}$/.test(session)) throw new GoogleIntegrationError('invalid_session', 401);
  const access = await client.schema('cali_workspace').rpc('workspace_private_access_v2');
  if (access.error || access.data !== true) throw new GoogleIntegrationError('workspace_access_denied', 403);
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = service.schema('cali_workspace');
  const profile = await db.from('profiles').select('id,role,company_id,active').eq('id', data.user.id).maybeSingle();
  if (profile.error || !profile.data?.active || !['admin', 'client'].includes(profile.data.role)) {
    throw new GoogleIntegrationError('profile_not_available', 403);
  }
  return { user: data.user, session, profile: profile.data, db, service, client, workspace: client.schema('cali_workspace') };
}

type Actor = Awaited<ReturnType<typeof googleActor>>;
type Purpose = 'calendar' | 'drive';
type GoogleRequest = ReturnType<typeof googleRequest>;

export async function startGoogleOAuth(config: GoogleRequest, actor: Actor, purpose: Purpose, company: string | null) {
  const redirect = config.assertCallback();
  const nonce = crypto.randomUUID();
  const expires = new Date(Date.now() + 600_000).toISOString();
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
  const stale = await actor.db.from('google_oauth_attempts').delete().lt('expires_at', new Date(Date.now() - 120_000).toISOString());
  if (stale.error) throw new GoogleIntegrationError('oauth_state_unavailable', 503);
  const pending = await actor.db.from('google_oauth_attempts').insert({
    nonce, user_id: actor.user.id, session_id: actor.session, company_id: company, purpose,
    redirect_uri: redirect, verifier, expires_at: expires,
  });
  if (pending.error) throw new GoogleIntegrationError('oauth_state_unavailable', 503);
  const state = base64url(encoder.encode(JSON.stringify({ purpose, nonce, company })));
  return { state, challenge, redirect };
}

export async function claimGoogleOAuth(config: GoogleRequest, actor: Actor, purpose: Purpose, state: string, code: string) {
  const redirect = config.assertCallback();
  if (!state || state.length > 2048 || !code || code.length > 4096) throw new GoogleIntegrationError('invalid_oauth_state');
  let parsed;
  try { parsed = parseBase64Json(state); } catch { throw new GoogleIntegrationError('invalid_oauth_state'); }
  if (parsed?.purpose !== purpose || typeof parsed.nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(parsed.nonce) ||
      (parsed.company !== null && (typeof parsed.company !== 'string' || !/^[a-f0-9-]{36}$/.test(parsed.company))) ||
      (actor.profile.role !== 'admin' && parsed.company !== actor.profile.company_id)) {
    throw new GoogleIntegrationError('invalid_oauth_state');
  }
  const claim = await actor.db.rpc('claim_google_oauth', {
    p_nonce: parsed.nonce, p_user: actor.user.id, p_session: actor.session, p_company: parsed.company,
    p_purpose: purpose, p_redirect: redirect, p_code: code,
  });
  if (claim.error) throw new GoogleIntegrationError('oauth_state_unavailable', 503);
  if (claim.data?.status === 'claimed') throw new GoogleIntegrationError('oauth_state_already_used', 409);
  if (claim.data?.status === 'complete') return { nonce: parsed.nonce, company: parsed.company, redirect, receipt: claim.data.receipt };
  if (claim.data?.status !== 'ready') throw new GoogleIntegrationError('invalid_oauth_state');
  return { nonce: parsed.nonce, company: parsed.company, redirect, verifier: claim.data.verifier as string };
}

export async function finishGoogleOAuth(actor: Actor, nonce: string, connection: string | null, target: string | null, credential: JsonObject) {
  const saved = await actor.db.rpc('finish_google_oauth', {
    p_nonce: nonce, p_connection: connection, p_target: target, p_credential: credential,
  });
  if (saved.error || !saved.data) throw new GoogleIntegrationError('oauth_receipt_unavailable', 503);
  return saved.data;
}

export async function withGoogleLease<T>(db: Actor['db'], key: string, action: (renew: () => Promise<void>) => Promise<T>) {
  const lease = crypto.randomUUID();
  async function renew() {
    const acquired = await db.rpc('lease_google_operation', { p_key: key, p_lease: lease });
    if (acquired.error) throw new GoogleIntegrationError('google_operation_unavailable', 503);
    if (!acquired.data) throw new GoogleIntegrationError('google_operation_busy', 409);
  }
  await renew();
  try { return await action(renew); }
  finally { await db.rpc('release_google_operation', { p_key: key, p_lease: lease }); }
}

export function googleFailure(config: GoogleRequest, error: GoogleIntegrationError | null) {
  return error
    ? config.json({ error: error.message }, error.status)
    : config.json({ error: 'google_integration_unavailable' }, 502);
}

export async function googleOAuthToken(
  config: GoogleRequest, actor: Actor, purpose: Purpose,
  attempt: { verifier: string; redirect: string; company: string | null }, code: string,
) {
  const response = await config.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: attempt.redirect,
      code_verifier: attempt.verifier, grant_type: 'authorization_code',
    }),
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token) throw new GoogleIntegrationError('google_token_exchange_failed');
  const me = await config.fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: 'Bearer ' + token.access_token },
  });
  const user = await me.json().catch(() => ({}));
  if (!me.ok || typeof user.email !== 'string' || typeof user.sub !== 'string' || user.email_verified !== true) {
    throw new GoogleIntegrationError('google_userinfo_failed');
  }
  config.assertAccount(user.email);
  const email = user.email.toLowerCase();
  const key = `${actor.user.id}:${attempt.company || 'self'}`;
  const { data: previous, error } = await actor.db.from('google_calendar_credentials')
    .select('account_email,provider_account_id,refresh_token').eq('credential_key', key).maybeSingle();
  if (error) throw new GoogleIntegrationError('google_credential_unavailable', 503);
  if (previous && (previous.account_email?.toLowerCase() !== email ||
    previous.provider_account_id && previous.provider_account_id !== user.sub)) {
    throw new GoogleIntegrationError('google_account_mismatch', 409);
  }
  const granted = new Set(String(token.scope || '').split(/\s+/));
  const required = purpose === 'drive'
    ? ['https://www.googleapis.com/auth/drive.file']
    : ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/calendar.readonly'];
  const other = purpose === 'drive' ? 'calendar_connections' : 'drive_connections';
  const sibling = await actor.db.from(other).select('id').eq('credential_key', key).eq('status', 'connected').limit(1).maybeSingle();
  if (sibling.error) throw new GoogleIntegrationError('google_connection_unavailable', 503);
  if (sibling.data) required.push(...(purpose === 'calendar'
    ? ['https://www.googleapis.com/auth/drive.file']
    : ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/calendar.readonly']));
  if (required.some(scope => !granted.has(scope))) throw new GoogleIntegrationError('google_scope_missing', 403);
  const refresh = token.refresh_token || previous?.refresh_token;
  if (!refresh) throw new GoogleIntegrationError('google_refresh_token_missing', 409);
  const data = {
    credential_key: key, user_id: actor.user.id, company_id: attempt.company,
    account_email: email, provider_account_id: user.sub, access_token: token.access_token,
    refresh_token: refresh, token_type: token.token_type || 'Bearer', scope: token.scope,
    expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  return data;
}

export async function revokeUnusedGoogleCredential(config: GoogleRequest, actor: Actor, key: string) {
  const [drive, calendar] = await Promise.all([
    actor.db.from('drive_connections').select('id').eq('credential_key', key).eq('status', 'connected').limit(1).maybeSingle(),
    actor.db.from('calendar_connections').select('id').eq('credential_key', key).eq('status', 'connected').limit(1).maybeSingle(),
  ]);
  if (drive.error || calendar.error || drive.data || calendar.data) return;
  const { data: credential, error } = await actor.db.from('google_calendar_credentials')
    .select('account_email,refresh_token,access_token').eq('credential_key', key).maybeSingle();
  if (error || !credential) return;
  config.assertAccount(credential.account_email);
  const token = credential.refresh_token || credential.access_token;
  if (token) {
    const removed = await config.fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }),
    });
    if (!removed.ok && removed.status !== 400) throw new GoogleIntegrationError('google_disconnect_retry', 502);
  }
  await actor.db.from('google_calendar_credentials').delete().eq('credential_key', key);
}
