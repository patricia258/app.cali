import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GET } from '../../api/form-preview.ts';

const origin = 'https://preview.example.test';
const database = 'https://api.example.test';
const key = 'sb_publishable_preview_fixture';

function previewEnvironment(t, url = database) {
  const previous = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  Object.assign(process.env, {
    VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key, VERCEL_ENV: 'preview',
  });
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

const request = (slug) => new Request(`${origin}/api/form-preview?slug=${encodeURIComponent(slug)}`);

test('prévia pública consulta apenas slug sanitizado e escapa metadados HTML', async (t) => {
  previewEnvironment(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({
    title: 'Formulário <QA> & "Teste"',
    description: '**Orientação**\n  ' + 'detalhes '.repeat(30),
  }));
  const response = await GET(request('QA-TESTE/<script>'));
  const html = await response.text();
  const [[url, init]] = fetch.mock.calls.map(({ arguments: args }) => args);
  assert.equal(url, database + '/rest/v1/rpc/cali_form_public');
  assert.deepEqual(JSON.parse(init.body), { p_slug: 'qa-testescript' });
  assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${key}`);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300, s-maxage=300');
  assert.match(html, /<title>Formulário &lt;QA&gt; &amp; &quot;Teste&quot;<\/title>/);
  assert.match(html, /<meta name="description" content="Orientação detalhes[^"]{1,143}…">/);
  assert.match(html, /rel="canonical" href="https:\/\/preview\.example\.test\/f\/qa-testescript"/);
});

test('prévia mantém metadados padrão em ausência, falha de rede e resposta malformada', async (t) => {
  previewEnvironment(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ title: 42 }));
  const assertFallback = async () => {
    const response = await GET(request('form'));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<title>CALI Forms<\/title>/);
  };
  await assertFallback();
  fetch.mock.mockImplementation(async () => Response.json(null));
  await assertFallback();
  fetch.mock.mockImplementation(async () => { throw new Error('rede indisponível'); });
  await assertFallback();
});

test('prévia em homologação recusa Supabase produtivo antes da consulta', async (t) => {
  previewEnvironment(t, 'https://kqtbfeeqbcllwvlkbrkq.supabase.co');
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(null));
  const response = await GET(request('form'));
  assert.equal(fetch.mock.callCount(), 0);
  assert.match(await response.text(), /<title>CALI Forms<\/title>/);
});
