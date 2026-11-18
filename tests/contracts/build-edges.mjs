import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const qa = resolve(root, '.cali-db-schema.local/qa');
const dependencies = resolve(qa, 'edge-sdk');
const sdkVersion = '2.112.3';
const pdfVersion = '1.17.1';
const groups = {
  access: ['workspace-access'],
  material: ['workspace-send-executive-report', 'portal-send-proposal', 'workspace-enviar-relatorio-mapa',
    'workspace-notification-email-hook', 'workspace-admin-daily-summary'],
  google: ['google-calendar-oauth', 'google-calendar-refresh-event', 'workspace-google-calendar-read',
    'workspace-sync-scheduled-event', 'google-drive-oauth'],
  public: ['cali-forms-confirmation', 'cali-profile-report-email'],
};
const resendCall = 'fetch("https://api.resend.com/emails",';

const captureAccess = `
async function sendToQaMailpit(options) {
  const message = JSON.parse(options.body);
  if (!Array.isArray(message.to) || !message.to.length || message.to.some(address => !address.endsWith('@example.test'))) {
    return Response.json({ error: 'Destinatário fora das fixtures locais.' }, { status: 400 });
  }
  const response = await fetch('http://mail:8025/api/v1/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      From: { Name: 'CALI Workspace QA', Email: 'workspace@example.test' },
      To: message.to.map(Email => ({ Email })), Subject: message.subject,
      HTML: String(message.html ?? '').replaceAll('https://app.calirh.com', 'http://127.0.0.1:56430'),
    }),
  });
  const body = await response.json().catch(() => ({}));
  return Response.json({ id: body.ID ?? body.id }, { status: response.status });
}
`;

const captureMaterial = `
const sentMessages = new Map();
async function captureQaDelivery(options) {
  const message = JSON.parse(options.body);
  if (!message.to?.length || message.to.some(email => !email.endsWith('@example.test'))) {
    return Response.json({ error: 'Destinatário fora das fixtures locais' }, { status: 400 });
  }
  const key = new Headers(options.headers).get('Idempotency-Key');
  if (!key) return Response.json({ error: 'Chave de operação ausente' }, { status: 400 });
  if (!sentMessages.has(key)) {
    sentMessages.set(key, (async () => {
      const response = await fetch('http://mail:8025/api/v1/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: { Name: 'CALI Workspace QA', Email: 'workspace@example.test' },
          To: message.to.map(Email => ({ Email })), Subject: message.subject,
          HTML: message.html, Text: message.text,
          Attachments: (message.attachments || []).map(item => ({
            Filename: item.filename, Content: item.content, ContentType: 'application/pdf',
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      return { id: result.ID ?? result.id, status: response.status };
    })());
  }
  const result = await sentMessages.get(key);
  if (result.status < 200 || result.status > 299) sentMessages.delete(key);
  return Response.json({ id: result.id }, { status: result.status });
}
`;

const capturePublic = `
async function captureQaDelivery(options) {
  const message = JSON.parse(options.body);
  if (!Array.isArray(message.to) || !message.to.length || message.to.some(address => !address.endsWith('@example.test'))) {
    return Response.json({ error: 'Destinatário fora das fixtures locais.' }, { status: 400 });
  }
  return fetch('http://mail:8025/api/v1/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      From: { Name: 'CALI Workspace QA', Email: 'workspace@example.test' },
      To: message.to.map(Email => ({ Email })), Subject: message.subject,
      HTML: String(message.html ?? '').replaceAll('https://app.calirh.com', 'http://127.0.0.1:56430'),
      Attachments: (message.attachments || []).map(item => ({
        Filename: item.filename, Content: item.content, ContentType: 'application/pdf',
      })),
    }),
  });
}
`;

async function requireVersion(name, expected) {
  const info = JSON.parse(await readFile(resolve(dependencies, 'node_modules', name, 'package.json'), 'utf8')
    .catch(() => { throw new Error('Instale as dependências isoladas conforme tests/contracts/README.md.'); }));
  if (info.version !== expected) throw new Error(`${name}: esperado ${expected}; encontrado ${info.version}.`);
}

function localPlugin(group, entry) {
  return { name: 'isolated-edge-dependencies-and-transports', setup(builder) {
    builder.onResolve({ filter: /^jsr:@supabase\/functions-js\/edge-runtime\.d\.ts$/ }, () => ({ path: 'types', namespace: 'qa-runtime' }));
    builder.onResolve({ filter: /^jsr:@std\/encoding@1\.0\.5\/base64$/ }, () => ({ path: 'base64', namespace: 'qa-runtime' }));
    builder.onLoad({ filter: /.*/, namespace: 'qa-runtime' }, ({ path }) => ({ contents: path === 'base64'
      ? 'export const encodeBase64 = bytes => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""));' : '' }));
    builder.onResolve({ filter: /^npm:@supabase\/supabase-js@/ }, args => {
      if (args.path !== `npm:@supabase/supabase-js@${sdkVersion}`) throw new Error('Pin SDK da fonte mudou: ' + args.path);
      return builder.resolve('@supabase/supabase-js', { resolveDir: dependencies, kind: 'import-statement' });
    });
    builder.onResolve({ filter: /^npm:pdf-lib@/ }, args => {
      if (args.path !== `npm:pdf-lib@${pdfVersion}`) throw new Error('Pin PDF da fonte mudou: ' + args.path);
      return builder.resolve('pdf-lib', { resolveDir: dependencies, kind: 'import-statement' });
    });
    builder.onLoad({ filter: /(?:\/index|\/material-email)\.ts$/ }, async ({ path }) => {
      const isMaterial = group === 'material' && (path.endsWith('/material-email.ts')
        || path.endsWith('/workspace-notification-email-hook/index.ts') || path.endsWith('/workspace-admin-daily-summary/index.ts'));
      if (!isMaterial && !(['access', 'public'].includes(group) && path === entry)) return null;
      const source = await readFile(path, 'utf8');
      const expected = group === 'access' ? 3 : path.endsWith('/workspace-notification-email-hook/index.ts') ? 2 : 1;
      if (source.split(resendCall).length - 1 !== expected) throw new Error('Caminhos de envio mudaram; revise o isolamento: ' + relative(root, path));
      const helper = group === 'access' ? captureAccess : group === 'material' ? captureMaterial : capturePublic;
      const call = group === 'access' ? 'sendToQaMailpit(' : 'captureQaDelivery(';
      return { contents: source.replaceAll(resendCall, call) + helper, loader: 'ts', resolveDir: dirname(path) };
    });
  } };
}

/** Compila artefatos locais; não instala, reinicia ou publica serviços. */
export async function buildLocalEdges(selected = 'all') {
  if (selected !== 'all' && !Object.hasOwn(groups, selected)) throw new Error('Grupo inválido: ' + selected);
  await requireVersion('@supabase/supabase-js', sdkVersion);
  await requireVersion('pdf-lib', pdfVersion);
  const evidence = [];
  for (const [group, endpoints] of Object.entries(groups)) {
    if (selected !== 'all' && selected !== group) continue;
    for (const endpoint of endpoints) {
      const entry = resolve(root, 'supabase/functions', endpoint, 'index.ts');
      const outfile = resolve(qa, group === 'google' ? 'google-bundles' : '', endpoint, 'index.ts');
      await mkdir(dirname(outfile), { recursive: true });
      const result = await build({
        absWorkingDir: root, entryPoints: [entry], outfile, platform: 'browser', format: 'esm', target: 'esnext',
        bundle: true, metafile: true, plugins: [localPlugin(group, entry)],
      });
      const inputs = Object.keys(result.metafile.inputs);
      const sdkInputs = inputs.filter(path => path.includes('node_modules/@supabase/'));
      if (!sdkInputs.length || sdkInputs.some(path => !resolve(root, path).startsWith(dependencies + sep))) {
        throw new Error('Bundle utilizou SDK fora da dependência isolada: ' + endpoint);
      }
      const bundle = await readFile(outfile, 'utf8');
      if (/fetch\(\s*["']https:\/\/api\.resend\.com\/emails/.test(bundle)) throw new Error('Transporte Resend permaneceu no bundle local: ' + endpoint);
      const sources = [];
      for (const path of inputs.filter(path => path.startsWith('supabase/functions/')).sort()) {
        sources.push({ path, sha256: createHash('sha256').update(await readFile(resolve(root, path))).digest('hex') });
      }
      evidence.push({ endpoint, sdkVersion, pdfVersion: group === 'public' ? pdfVersion : null,
        outfile: relative(root, outfile), sha256: createHash('sha256').update(bundle).digest('hex'), sources });
    }
  }
  const dependencyLockSha256 = createHash('sha256').update(await readFile(resolve(dependencies, 'package-lock.json'))).digest('hex');
  await writeFile(resolve(qa, `edge-build-${selected}.json`), JSON.stringify({
    builtAt: new Date().toISOString(), dependencyLockSha256, evidence,
  }, null, 2) + '\n', { mode: 0o600 });
  console.log(`PASS bundles locais: ${evidence.length} Edges; Supabase ${sdkVersion}; grupo ${selected}; nenhum serviço reiniciado.`);
  return evidence;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildLocalEdges(process.argv[2] ?? 'all');
