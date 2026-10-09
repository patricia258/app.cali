/* Guard this visual migration against accidental operational changes. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const base = process.env.CALI_VISUAL_BASE || '7d817c3d64e3839eb10475233b4e43b92a9914cb';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const tracked = git('ls-tree','-r','--name-only',base).trim().split('\n');
const normalize = text => text
  .replace(/^import ['"][^'"]+\.css['"];\r?\n/gm,'')
  .replace(' data-visual-system="v2" data-workspace-role={role}','');
let checked = 0;
for (const file of tracked.filter(file => /\.(tsx?|sql)$/.test(file) && (file.startsWith('src/') || file.startsWith('supabase/')))) {
  const previous = git('show',`${base}:${file}`);
  assert.ok(fs.existsSync(file),`Operational source removed: ${file}`);
  assert.equal(normalize(fs.readFileSync(file,'utf8')), normalize(previous), `Operational source changed: ${file}`);
  checked++;
}
for (const [target, sources] of [
  ['src/styles/client-home.css',['client-home-v2','client-home-v3','client-home-v4','client-home-v5']],
  ['src/styles/client-calendar.css',['client-timeline-v2','client-timeline-v3']],
]) {
  const expected = sources.map(file => git('show',`${base}:src/${file}.css`)).join('\n');
  assert.equal(fs.readFileSync(target,'utf8').replace(/^\/\* Consolidated operational styles\. Original source order preserved\. \*\/\n/,''),expected,`Consolidation changed source order/content: ${target}`);
  for (const source of sources) assert.ok(!fs.existsSync(`src/${source}.css`),`Redundant style layer retained: ${source}`);
}
for (const file of fs.readdirSync('src/styles').filter(file=>file.endsWith('.css'))) {
  postcss.parse(fs.readFileSync(`src/styles/${file}`,'utf8'),{from:file});
}
console.log(`PASS: ${checked} operational sources preserved; stylesheet consolidations identical; canonical CSS parses.`);
console.log('This is a source-integrity check, not an authenticated end-to-end test.');
