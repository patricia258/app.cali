import assert from 'node:assert/strict';
import { createServer } from 'vite';

export const apiOrigin = 'https://api.example.test';
export const publishableKey = 'sb_publishable_workspace_fixture';
export const actorId = '4c801da1-47c0-44df-bb47-73d1ea39cd76';

export async function workspaceHttp(t) {
  const requests = [];
  const expected = [];
  const problems = [];
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const browser = { location: { origin: 'http://127.0.0.1:5173' } };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
    assert.deepEqual(problems, [], 'Requisições inesperadas');
    assert.deepEqual(expected.map(({ method, path }) => [method, path]), [], 'Respostas não consumidas');
  });
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const body = await request.text();
    const call = { method: request.method, url, headers: request.headers, body: body ? JSON.parse(body) : null };
    requests.push(call);
    const index = expected.findIndex((item) => item.method === call.method && item.path === url.pathname);
    if (url.origin !== apiOrigin || index < 0) {
      problems.push(`${call.method} ${url.origin}${url.pathname}`);
      return Response.json({ message: 'Requisição fora do contrato do teste.' }, { status: 502 });
    }
    const [reply] = expected.splice(index, 1);
    if (reply.data instanceof Response) return reply.data;
    return reply.status === 204 ? new Response(null, { status: 204 }) : Response.json(reply.data, { status: reply.status });
  });

  const vite = await createServer({
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    appType: 'custom',
    esbuild: { jsx: 'automatic' },
    server: { middlewareMode: true, hmr: false, watch: null },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(apiOrigin),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(publishableKey),
    },
  });
  t.after(() => vite.close());

  const respond = (path, data, { method = 'POST', status = 200 } = {}) => {
    expected.push({ method, path, data, status });
  };
  const loadSource = (path) => vite.ssrLoadModule('/src/' + path);
  const load = (path) => loadSource('api/' + path);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: actorId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.c2lnbmF0dXJl`;
  const session = { access_token: accessToken, refresh_token: 'fixture-refresh' };
  const user = { id: actorId, email: 'admin@example.test', aud: 'authenticated' };

  async function signIn() {
    const { supabase } = await load('supabase.ts');
    respond('/auth/v1/user', user, { method: 'GET' });
    const { error } = await supabase.auth.setSession(session);
    assert.equal(error, null);
  }

  return { load, loadSource, respond, requests, browser, session, user, accessToken, signIn };
}
