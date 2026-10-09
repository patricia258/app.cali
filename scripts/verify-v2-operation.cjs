/* Guard this visual migration against accidental operational changes. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const ts = require('typescript');
const refactoredViews = new Set(['src/pages/client/ClientDashboard.tsx','src/components/WorkspaceShell.tsx']);
const printer = ts.createPrinter({removeComments:true});
function sourceTree(text) { return ts.createSourceFile('view.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX); }
function operationalStatements(text) {
  const transformed = ts.transform(sourceTree(text), [context => {
    const visit = node => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return ts.factory.createStringLiteral('VIEW');
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text.endsWith('/ClientHomeTeam')) return undefined;
      return ts.visitEachChild(node,visit,context);
    };
    return root => ts.visitNode(root,visit);
  }]);
  const result = printer.printFile(transformed.transformed[0]);
  transformed.dispose();
  return result;
}
function bindings(text) {
  const found=[]; const source=sourceTree(text);
  const visit=node=>{
    if(ts.isJsxAttribute(node) && /^(on[A-Z].*|value|disabled|href|to|required|readOnly|aria-value.*)$/.test(node.name.getText(source))) found.push(printer.printNode(ts.EmitHint.Unspecified,node,source));
    ts.forEachChild(node,visit);
  }; visit(source); return found;
}
function preserveBindings(previous,current,file) {
  const existing=bindings(current);
  for(const binding of bindings(previous)) { const index=existing.indexOf(binding); assert.ok(index>=0,`Binding removed or changed in ${file}: ${binding}`);existing.splice(index,1); }
}
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
  const current=fs.readFileSync(file,'utf8');
  if(refactoredViews.has(file)) {
    assert.equal(operationalStatements(current),operationalStatements(previous),`Non-visual statements changed: ${file}`);
    preserveBindings(previous,current,file);
  } else assert.equal(normalize(current), normalize(previous), `Operational source changed: ${file}`);
  checked++;
}
for (const [target, sources] of [
  ['src/styles/client-calendar.css',['client-timeline-v2','client-timeline-v3']],
]) {
  const expected = sources.map(file => git('show',`${base}:src/${file}.css`)).join('\n');
  assert.equal(fs.readFileSync(target,'utf8').replace(/^\/\* Consolidated operational styles\. Original source order preserved\. \*\/\n/,''),expected,`Consolidation changed source order/content: ${target}`);
  for (const source of sources) assert.ok(!fs.existsSync(`src/${source}.css`),`Redundant style layer retained: ${source}`);
}
for (const file of fs.readdirSync('src/styles').filter(file=>file.endsWith('.css'))) {
  postcss.parse(fs.readFileSync(`src/styles/${file}`,'utf8'),{from:file});
}
for (const source of ['client-home-v2','client-home-v3','client-home-v4','client-home-v5']) assert.ok(!fs.existsSync(`src/${source}.css`),`Obsolete home style retained: ${source}`);
assert.ok(!/client-home-v[2345]/.test(fs.readFileSync('src/pages/client/ClientDashboard.tsx','utf8')), 'Legacy home view retained');
console.log(`PASS: ${checked} existing operational sources checked; refactored JSX retains every action/value/navigation binding; CSS parses.`);
console.log('This is a source-integrity check, not an authenticated end-to-end test.');
