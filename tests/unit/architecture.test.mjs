import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const src = fileURLToPath(new URL('../../src/', import.meta.url));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('application navigation and cross-role flows retain their documented owners', () => {
  assert.equal(existsSync(join(src, 'app/navigation')), false);
  assert.equal(existsSync(join(src, 'modules/shared')), false);
  for (const owner of [
    'components/navigation', 'hooks/useSearchParams.ts', 'hooks/useLocation.ts',
    'modules/records/WorkspaceRecordsPage.tsx', 'modules/calendar/AdminCalendarPage.tsx',
  ]) assert.ok(existsSync(join(src, owner)), owner);
});

test('componentes e páginas usam nomes de arquivo por função', () => {
  const files = ['components', 'modules'].flatMap((directory) => sourceFiles(join(src, directory)));
  const versionedFiles = files.filter((file) => /v\d+\.tsx$/i.test(basename(file)));
  assert.deepEqual(versionedFiles.map((file) => file.slice(src.length)), []);
});

test('custom hooks live in their own named files', () => {
  const violations = [];
  for (const file of sourceFiles(src)) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      const declaresHook = ts.isFunctionDeclaration(node) || (ts.isVariableDeclaration(node) &&
        node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)));
      const name = declaresHook && node.name && ts.isIdentifier(node.name) ? node.name.text : '';
      if (/^use[A-Z]/.test(name) && !new Set([`${name}.ts`, `${name}.tsx`]).has(basename(file))) {
        violations.push(`${name} em ${file}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(violations, []);
});

test('telas e runtimes acessam Supabase por adaptadores de domínio', () => {
  const apiDirectory = join(src, 'api') + '/';
  const violations = [];
  for (const file of sourceFiles(src).filter((path) => !path.startsWith(apiDirectory))) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const module = node.moduleSpecifier.text;
      if (/\/api\/supabase(?:\.ts)?$/.test(module) || (module === '@supabase/supabase-js' && !node.importClause?.isTypeOnly)) {
        violations.push(file.slice(src.length) + ' → ' + module);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('o bootstrap usa folhas do fluxo com Tailwind e mantém retirado o carregador legado', () => {
  assert.equal(existsSync(join(src, 'styles/legacy')), false);
  assert.ok(existsSync(join(src, 'styles/tailwind.css')));
  const obsoleteImports = sourceFiles(src).filter((file) => /styles\/legacy|loadLegacyStyles/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(obsoleteImports, []);
});


test('cada rota registrada tem um caso de navegação no Playwright', () => {
  const matrix = fileURLToPath(new URL('../e2e/routes.cjs', import.meta.url));
  const { cases } = JSON.parse(execFileSync(process.execPath, [matrix, '--list'], { encoding: 'utf8' }));
  const paths = Object.values(cases).flat().filter((path) => path.startsWith('/'))
    .map((path) => new URL(path, 'http://127.0.0.1').pathname.split('/'));
  const file = join(src, 'app/router.tsx');
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declared = new Set();

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteral(arg) && node.expression.text === 'defineRoute') declared.add(arg.text);
      if (arg && ts.isStringLiteral(arg) && node.expression.text === 'staffSection') {
        declared.add(arg.text === '/' ? '/equipe' : '/equipe/' + arg.text);
      }
      if (arg && ts.isObjectLiteralExpression(arg) && node.expression.text === 'createRoute') {
        const path = arg.properties.find((prop) => ts.isPropertyAssignment(prop) && prop.name.getText(source) === 'path');
        if (path && ts.isStringLiteral(path.initializer)) {
          const parent = arg.properties.find((prop) => ts.isPropertyAssignment(prop) && prop.name.getText(source) === 'getParentRoute');
          const owner = parent && ts.isArrowFunction(parent.initializer) ? parent.initializer.body.getText(source) : null;
          assert.ok(owner === 'rootRoute' || owner === 'staffRoute', 'Declare o pai da rota na matriz de navegação.');
          const prefix = owner === 'staffRoute' ? '/equipe/' : '/';
          declared.add(prefix + path.initializer.text.replace(/^\//, ''));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  assert.ok(declared.size > 0);
  const missing = [...declared].filter((path) => {
    const segments = path.split('/');
    const wildcard = segments.at(-1) === '$';
    return !paths.some((candidate) => (wildcard ? candidate.length >= segments.length : candidate.length === segments.length)
      && segments.every((segment, index) => segment.startsWith('$') ? Boolean(candidate[index]) : segment === candidate[index]));
  });
  assert.deepEqual(missing, []);
});
