'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { parseArgs } = require('node:util');
const { defaultChrome } = require('./loopback.cjs');

const { values } = parseArgs({
  options: {
    dist: { type: 'string' },
    output: { type: 'string' },
    suite: { type: 'string', multiple: true },
    chrome: { type: 'string', default: process.env.CALI_E2E_CHROME || defaultChrome() },
  },
});

const suites = [
  { name: 'routes', standalone: true },
  { name: 'guards', standalone: true },
  { name: 'journeys' },
  { name: 'interactions' },
  { name: 'design-browser' },
  { name: 'account-and-overview' },
  { name: 'commercial-delivery' },
];

function main() {
  const root = resolve(__dirname, '../..');
  const output = values.output ? resolve(values.output) : mkdtempSync(join(tmpdir(), 'cali-e2e-'));
  mkdirSync(output, { recursive: true });
  const dist = values.dist ? resolve(values.dist) : join(output, 'dist');
  const selected = values.suite ? suites.filter((suite) => values.suite.includes(suite.name)) : suites;
  assert(
    selected.length &&
      (!values.suite || values.suite.every((name) => selected.some((suite) => suite.name === name))),
    'Suíte desconhecida. Use --suite com ' + suites.map((suite) => suite.name).join(', '),
  );
  assert(
    existsSync(values.chrome),
    'Chrome ausente. Instale Chromium com npx playwright-core install chromium ou indique CALI_E2E_CHROME.',
  );

  if (!values.dist) {
    const npm = process.env.npm_execpath ? [process.execPath, process.env.npm_execpath] : ['npm'];
    const build = spawnSync(npm[0], [...npm.slice(1), 'run', 'build', '--', '--outDir', dist], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        VITE_SUPABASE_URL: 'https://cali-local-qa.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_qa_fixture',
      },
    });
    writeFileSync(join(output, 'build.log'), (build.stdout || '') + (build.stderr || ''));
    assert.equal(build.status, 0, 'Build sintético falhou. Veja ' + join(output, 'build.log'));
  }
  assert(existsSync(join(dist, 'index.html')), 'Build ausente em ' + dist);
  assert(
    readdirSync(join(dist, 'assets'))
      .filter((name) => name.endsWith('.js'))
      .some((name) =>
        readFileSync(join(dist, 'assets', name), 'utf8').includes('https://cali-local-qa.supabase.co'),
      ),
    'Build incompatível. Use o build sintético automático ou forneça um dist com VITE_SUPABASE_URL=https://cali-local-qa.supabase.co.',
  );

  let failed = 0;
  for (const suite of selected) {
    console.log('Executando ' + suite.name + '…');
    const artifact = join(output, suite.standalone ? suite.name + '.json' : suite.name);
    const run = spawnSync(
      process.execPath,
      [join(__dirname, suite.name + '.cjs'), '--dist', dist, '--chrome', values.chrome, '--output', artifact],
      { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 180_000 },
    );
    writeFileSync(join(output, suite.name + '-progress.log'), (run.stdout || '') + (run.stderr || ''));
    if (run.status !== 0) {
      failed++;
      console.error(suite.name + ' falhou. ' + join(output, suite.name + '-progress.log'));
    } else {
      const summary = JSON.parse(run.stdout);
      const passed = summary.reference?.passes ?? summary.passes ?? summary.passed;
      console.log(suite.name + ' · ' + passed + '/' + (summary.total ?? passed));
    }
  }
  console.log('Evidência em ' + output);
  if (failed) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
