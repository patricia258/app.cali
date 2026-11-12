'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { closeSync, mkdtempSync, mkdirSync, openSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const project = join(__dirname, '../../..');
const fixtureOrigin = 'https://cali-local-qa.supabase.co';
const environment = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('VITE_'))),
  VITE_SUPABASE_URL: fixtureOrigin,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_qa_fixture',
};

function command(program, args, cwd, extra = {}) {
  const result = spawnSync(program, args, { cwd, env: environment, maxBuffer: 32 * 1024 * 1024, ...extra });
  if (result.error) throw result.error;
  return result;
}

function sha(ref) {
  const revision = command('git', ['rev-parse', '--verify', '--end-of-options', ref + '^{commit}'], project, {
    encoding: 'utf8',
  });
  assert.equal(revision.status, 0, 'Commit de referência indisponível: ' + ref);
  return revision.stdout.trim();
}

function buildArtifact(output, label, ref) {
  const source = mkdtempSync(join(tmpdir(), 'cali-visual-source-'));
  const dist = join(output, label + '-dist');
  const log = join(output, label + '-build.log');
  try {
    const tar = join(source, 'source.tar');
    const file = openSync(tar, 'wx');
    try {
      const archive = command('git', ['archive', ref], project, { stdio: ['ignore', file, 'pipe'] });
      assert.equal(archive.status, 0, 'Falha extraindo ' + ref);
    } finally {
      closeSync(file);
    }
    const extracted = command('tar', ['-xf', tar], source);
    assert.equal(extracted.status, 0, 'Falha descompactando ' + ref);
    rmSync(tar);
    const install = command('npm', ['ci', '--offline', '--no-audit', '--no-fund'], source, { encoding: 'utf8' });
    let buildLog = install.stdout + install.stderr;
    writeFileSync(log, buildLog);
    assert.equal(install.status, 0, 'Dependências fora do cache npm. Veja ' + log);
    mkdirSync(dist, { recursive: true });
    const build = command('npm', ['run', 'build', '--', '--outDir', dist, '--emptyOutDir'], source, {
      encoding: 'utf8',
    });
    buildLog += build.stdout + build.stderr;
    writeFileSync(log, buildLog);
    assert.equal(build.status, 0, 'Build falhou. Veja ' + log);
    return dist;
  } finally {
    rmSync(source, { recursive: true, force: true });
  }
}

module.exports = { buildArtifact, fixtureOrigin, sha };
