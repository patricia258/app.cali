import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./edge-imports.mjs', import.meta.url);

export const workspace = 'http://127.0.0.1:56430';
export const api = 'http://ingress:56431';
export const endpointRoot = new URL('../../../supabase/functions/', import.meta.url);
const configured = {
  SUPABASE_URL: api,
  SUPABASE_ANON_KEY: 'qa-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'qa-service',
  RESEND_API_KEY: 'qa-resend',
  CALI_DELIVERY_MODE: 'isolated',
  CALI_DELIVERY_APP_ORIGIN: workspace,
  WORKSPACE_ACCESS_ALLOWED_ORIGINS: workspace,
  CALI_GOOGLE_MODE: 'local',
  GOOGLE_REDIRECT_URI: workspace + '/oauth/google/callback',
  GOOGLE_CLIENT_ID: 'qa-google-id',
  GOOGLE_CLIENT_SECRET: 'qa-google-secret',
  GOOGLE_LOCAL_PROVIDER_URL: 'http://google-qa:9000',
  GOOGLE_LOCAL_AUTHORIZE_URL: 'http://127.0.0.1:56433',
  GOOGLE_TEST_ATTENDEES: 'cliente-a@example.test',
};
const handlers = new Map();
let importing;

globalThis.Deno = {
  env: { get: name => configured[name] },
  serve: handler => handlers.set(importing, handler),
};
globalThis.fetch = async () => assert.fail('Unexpected network request in Edge unit test');

export async function handler(name) {
  if (!handlers.has(name)) {
    importing = name;
    await import(new URL(`${name}/index.ts`, endpointRoot));
  }
  return handlers.get(name);
}

export function request(endpoint, { method = 'POST', origin = workspace, body = {}, headers = {} } = {}) {
  return new Request(`${api}/functions/v1/${endpoint}`, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}

export function transport(t, respond) {
  return t.mock.method(globalThis, 'fetch', async (input, init) => respond(new Request(input, init)));
}
