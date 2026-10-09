/* Guard this visual migration against accidental operational changes. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const ts = require('typescript');
const refactoredViews = new Set(['src/pages/client/ClientDashboard.tsx','src/components/WorkspaceShell.tsx','src/pages/client/ClientHoursPage.tsx','src/pages/client/ClientDocumentsPage.tsx','src/pages/client/ClientReportsPageV5.tsx','src/pages/client/ClientTimelinePage.tsx','src/pages/client/ClientDeliverablesPage.tsx']);
const hooks = JSON.parse(fs.readFileSync('scripts/v2-operational-hooks.json','utf8'));
refactoredViews.add('src/pages/records/WorkspaceRecordsPage.tsx');
refactoredViews.add('src/pages/team/CompanyTeamPage.tsx');
refactoredViews.add('src/pages/team/TeamMonthWizard.tsx');
refactoredViews.add('src/pages/client/ClientFrontsPage.tsx');
function normalizeHookSelectors(text) {
  const source=sourceTree(text), edits=[];
  function visit(node) {
    if(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['querySelector','querySelectorAll','closest','matches'].includes(node.expression.name.text) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) {
      let selector=node.arguments[0].text;
      for(const [original,semantic] of hooks.mapping) selector=selector.replaceAll(semantic,original);
      edits.push([node.arguments[0].getStart(source),node.arguments[0].end,JSON.stringify(selector)]);
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0])) text=text.slice(0,start)+value+text.slice(end);
  return text;
}
const printer = ts.createPrinter({removeComments:true});
function sourceTree(text) { return ts.createSourceFile('view.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX); }
function operationalStatements(text) {
  const transformed = ts.transform(sourceTree(text.replace("useState<'week'|'list'|'month'>('week')", "useState<'week'|'list'>('week')")), [context => {
    const visit = node => {
      // The new client record rows are a presentation branch; the admin table remains.
      if(ts.isIfStatement(node) && node.expression.getText().replace(/\s/g,'') === "role==='client'" && ts.isReturnStatement(node.thenStatement) && node.thenStatement.expression && ts.isJsxElement(node.thenStatement.expression)) return undefined;
      if (ts.isParenthesizedExpression(node) && (ts.isJsxElement(node.expression) || ts.isJsxSelfClosingElement(node.expression) || ts.isJsxFragment(node.expression))) return ts.factory.createStringLiteral('VIEW');
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return ts.factory.createStringLiteral('VIEW');
      // Presentation imports may change when old JSX is replaced. Backend/auth imports remain audited.
      if (ts.isImportDeclaration(node) && (/^(react|lucide-react)$/.test(node.moduleSpecifier.text) || node.moduleSpecifier.text.endsWith('.css') || /\/(ClientHomeTeam|ClientDocumentBrandCover)$/.test(node.moduleSpecifier.text))) return undefined;
      // Added view states have no backend effects: layout, project tabs, accordion.
      if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1 && ['[layout, setLayout]','[projectTab, setProjectTab]','[expandedFronts, setExpandedFronts]'].includes(node.declarationList.declarations[0].name.getText())) return undefined;
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
  const existing=new Set(bindings(current));
  // Responsive V2 uses one control instead of duplicate desktop/mobile controls.
  // Every distinct original expression is required, including navigation and disabled state.
  for(const binding of new Set(bindings(previous))) assert.ok(existing.has(binding),`Binding removed or changed in ${file}: ${binding}`);
}
const base = process.env.CALI_VISUAL_BASE || 'eaf58057275312ae807a640b3dfa08e24c8d6ea1';
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
  } else if(file==='src/App.tsx') {
    let viewLoads=current;
    for(const [name,old] of [['ClientRecordsPage','records'],['ClientDeliverablesPage','clientDeliverables'],['ClientHoursPage','hours'],['ClientDocumentsPage','documents']]) {
      const start=viewLoads.indexOf(`const ${name} = lazy(`),end=viewLoads.indexOf('\n});',start);
      const loader=viewLoads.slice(start,end).replace("await import('./styles/routes/clientModules');",`await import('./styles/routes/${old}');`);
      viewLoads=viewLoads.slice(0,start)+loader+viewLoads.slice(end);
    }
    assert.equal(normalize(viewLoads),normalize(previous),'Routes changed beyond client presentation loaders');
  } else if(hooks.files.includes(file)) assert.equal(normalize(normalizeHookSelectors(current)),normalize(normalizeHookSelectors(previous)),`Runtime operation changed beyond DOM selectors: ${file}`);
  else assert.equal(normalize(current), normalize(previous), `Operational source changed: ${file}`);
  checked++;
}
for (const [target, sources] of [
  ['src/styles/client-calendar.css',['client-timeline-v2','client-timeline-v3']],
]) {
  const expected = sources.map(file => git('show',`7d817c3d64e3839eb10475233b4e43b92a9914cb:src/${file}.css`)).join('\n');
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
