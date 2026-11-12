import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPublicSupabaseKey, readSupabaseEnvironment } from '../../src/api/environment.ts';

const live = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const app = 'https://app.calirh.com';
const preview = 'https://preview.example.test';
const local = 'http://127.0.0.1:56430';
const key = 'sb_publishable_workspace_test';
const jwt = (role) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

test('preview and development refuse the production database, including the DNS-qualified hostname', () => {
  for (const url of [live, `${live}.`]) {
    assert.equal(readSupabaseEnvironment({ url, key, origin: preview, allowProduction: true }), null);
    assert.equal(readSupabaseEnvironment({ url, key, origin: local, allowProduction: false }), null);
  }
  assert.deepEqual(readSupabaseEnvironment({ url: live, key, origin: app, allowProduction: true }), { url: live, key });
});

test('the browser accepts public credentials and rejects privileged keys', () => {
  assert.equal(isPublicSupabaseKey(key), true);
  assert.equal(isPublicSupabaseKey(jwt('anon')), true);
  for (const rejected of ['sb_secret_test', jwt('service_role'), jwt('authenticated'), 'invalid', 'a.b.c']) {
    assert.equal(isPublicSupabaseKey(rejected), false);
  }
});

test('an isolated hosted project is valid on preview and local endpoints require a local page', () => {
  const isolated = 'https://workspace-qa.example.test';
  assert.deepEqual(readSupabaseEnvironment({ url: isolated, key, origin: preview, allowProduction: true }), { url: isolated, key });
  const url = 'http://127.0.0.1:56431';
  assert.deepEqual(readSupabaseEnvironment({ url, key, origin: local, allowProduction: false }), { url, key });
  assert.equal(readSupabaseEnvironment({ url, key, origin: preview, allowProduction: true }), null);
});

test('rejects configured URLs with credentials, paths, queries, fragments or remote HTTP', () => {
  for (const url of [
    'https://user:pass@workspace-qa.example.test',
    'https://workspace-qa.example.test/rest/v1',
    'https://workspace-qa.example.test/?source=test',
    'https://workspace-qa.example.test/#fragment',
    'http://workspace-qa.example.test',
  ]) assert.equal(readSupabaseEnvironment({ url, key, origin: preview, allowProduction: true }), null);
});
