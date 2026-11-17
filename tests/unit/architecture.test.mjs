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

test('as primitivas do design system usam tokens de cor e tamanhos de texto da escala', () => {
  const directColor = /#[\da-f]{3,8}\b|(?<![\w-])rgba?\(/i;
  const directTextSize = /:text-\[(?:[\d.]+(?:px|em|rem)|clamp\()/;
  const violations = sourceFiles(join(src, 'components/ds')).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return directColor.test(source) || directTextSize.test(source) ? [basename(file)] : [];
  });
  assert.deepEqual(violations, []);
});

test('o texto de tamanho fixo usa a escala nas páginas, módulos e componentes', () => {
  const directSize = /:text-\[(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem)\]/;
  const violations = sourceFiles(src).filter((file) => directSize.test(readFileSync(file, 'utf8')));
  assert.deepEqual(violations, []);
});

test('controles comuns de formulário usam as primitivas do design system', () => {
  const specializedTypes = new Set(['color', 'file', 'hidden', 'radio', 'range']);
  const violations = [];
  for (const file of sourceFiles(src).filter((path) => path.endsWith('.tsx') && !path.startsWith(join(src, 'components/ds') + '/'))) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        if (tag === 'select' || tag === 'textarea') {
          violations.push(file.slice(src.length) + ': ' + tag);
        }
        if (tag === 'input') {
          const type = node.attributes.properties.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'type')?.initializer;
          if (!type || !ts.isStringLiteral(type) || !specializedTypes.has(type.text)) {
            violations.push(file.slice(src.length) + ': input');
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(violations, []);
});

test('application navigation and cross-role flows retain their documented owners', () => {
  assert.equal(existsSync(join(src, 'app/navigation')), false);
  assert.equal(existsSync(join(src, 'modules/shared')), false);
  for (const owner of [
    'components/navigation', 'hooks/useSearchParams.ts', 'hooks/useLocation.ts',
    'modules/records/WorkspaceRecordsPage.tsx', 'modules/calendar/AdminCalendarPage.tsx',
  ]) assert.ok(existsSync(join(src, owner)), owner);
});

test('arquivos e diretórios do repositório usam nomes por função', () => {
  const root = join(src, '..');
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  }).split('\0');
  const versionedPaths = files.filter((file) => {
    if (!/v\d+(?:[a-z])?(?=$|[./_-])/i.test(file) || !existsSync(join(root, file))) return false;
    const migration = /^supabase\/migrations\/(\d+)_/.exec(file);
    // Último caminho de migration com revisão no nome antes da adoção desta convenção.
    return !migration || Number(migration[1]) > 20261003170000;
  });
  assert.deepEqual(versionedPaths, []);
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

test('consultas e mutações da interface ficam em hooks por operação', () => {
  const hooks = new Set([
    'useQuery', 'useInfiniteQuery', 'useQueries',
    'useSuspenseQuery', 'useSuspenseInfiniteQuery', 'useSuspenseQueries', 'useMutation',
  ]);
  const loaders = new Set(['fetchQuery', 'fetchInfiniteQuery', 'prefetchQuery', 'prefetchInfiniteQuery', 'ensureQueryData', 'ensureInfiniteQueryData']);
  const violations = [];
  for (const file of sourceFiles(src)) {
    const isHook = /^use[A-Z].*\.tsx?$/.test(basename(file));
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = new Map();
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== '@tanstack/react-query') continue;
      const bindings = node.importClause?.namedBindings;
      if (!bindings) continue;
      if (ts.isNamespaceImport(bindings)) {
        violations.push(file.slice(src.length) + ' importa React Query como namespace');
        continue;
      }
      for (const binding of bindings.elements) {
        const name = (binding.propertyName ?? binding.name).text;
        if (hooks.has(name)) imports.set(binding.name.text, name);
      }
    }
    let operations = 0;
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const hook = ts.isIdentifier(callee) ? imports.get(callee.text) : undefined;
        const loader = ts.isPropertyAccessExpression(callee) && loaders.has(callee.name.text) ? callee.name.text : undefined;
        if (hook || loader) {
          operations++;
          if (!isHook) violations.push(file.slice(src.length) + ' executa ' + (hook || loader));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (isHook && operations > 1) violations.push(file.slice(src.length) + ' junta operações de Query');
  }
  assert.deepEqual(violations, []);
});

test('chaves de Query vêm de funções tipadas no domínio', () => {
  const violations = [];
  const cacheMethods = new Set(['getQueryData', 'getQueryState', 'setQueryData']);
  for (const file of sourceFiles(src)) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const locals = new Map();
    function collectLocals(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const definitions = locals.get(node.name.text) ?? [];
        definitions.push(node.initializer);
        locals.set(node.name.text, definitions);
      }
      ts.forEachChild(node, collectLocals);
    }
    collectLocals(source);
    function isInlineKey(value, visited = new Set()) {
      if (!value || visited.has(value)) return false;
      visited.add(value);
      if (ts.isAsExpression(value) || ts.isSatisfiesExpression(value) || ts.isParenthesizedExpression(value)) {
        return isInlineKey(value.expression, visited);
      }
      if (ts.isIdentifier(value)) {
        return (locals.get(value.text) ?? []).some((definition) => isInlineKey(definition, visited));
      }
      return ts.isArrayLiteralExpression(value);
    }
    function visit(node) {
      if (ts.isPropertyAssignment(node) && /^(queryKey|mutationKey)$/.test(node.name.getText(source)) && isInlineKey(node.initializer)) {
        violations.push(file.slice(src.length) + ' declara chave direta');
      }
      if (ts.isShorthandPropertyAssignment(node) && /^(queryKey|mutationKey)$/.test(node.name.text) && isInlineKey(node.name)) {
        violations.push(file.slice(src.length) + ' usa chave local em vez da fábrica do domínio');
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        cacheMethods.has(node.expression.name.text) && isInlineKey(node.arguments[0])) {
        violations.push(file.slice(src.length) + ' manipula cache com chave direta');
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(violations, []);
});

test('componentes usam os hooks do projeto para TanStack Form e Router', () => {
  const violations = [];
  for (const file of sourceFiles(src).filter((path) => !/^use[A-Z].*\.tsx?$/.test(basename(path)))) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) ||
        !['@tanstack/react-form', '@tanstack/react-router'].includes(node.moduleSpecifier.text)) continue;
      const bindings = node.importClause?.namedBindings;
      if (!bindings) continue;
      if (ts.isNamespaceImport(bindings) ||
        bindings.elements.some((binding) => /^use[A-Z]/.test((binding.propertyName ?? binding.name).text))) {
        violations.push(file.slice(src.length));
      }
    }
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
  const workspace = join(src, 'components/workspace');
  assert.equal(existsSync(join(workspace, 'workspace-shell.generated.css')), false);
  assert.equal(existsSync(join(workspace, 'document-shell.css')), false);
  assert.equal(existsSync(join(workspace, 'operational.css')), false);
  const obsoleteImports = sourceFiles(src).filter((file) =>
    /styles\/legacy|loadLegacyStyles|workspace-shell\.generated\.css|document-shell\.css|operational\.css/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(obsoleteImports, []);
});

test('interfaces não montam nem remontam a marcação React pelo DOM', () => {
  const violations = sourceFiles(src).flatMap((file) => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const findings = [];
    function visit(node) {
      const htmlProp = ts.isJsxAttribute(node) && node.name.getText(source) === 'dangerouslySetInnerHTML';
      const mutationObserver = ts.isNewExpression(node) && /(?:^|\.)MutationObserver$/.test(node.expression.getText(source));
      const documentWrite = ts.isCallExpression(node) && /(?:^|\.)document\.write$/.test(node.expression.getText(source));
      const imperativeControl = ts.isCallExpression(node) && /(?:^|\.)document\.createElement$/.test(node.expression.getText(source))
        && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && /^(dialog|form|button|textarea|input|select)$/.test(node.arguments[0].text);
      const htmlAssignment = ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isPropertyAccessExpression(node.left) && ['innerHTML', 'outerHTML'].includes(node.left.name.text);
      if (htmlProp || mutationObserver || documentWrite || imperativeControl || htmlAssignment) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        findings.push(`${file.slice(src.length)}:${line + 1}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return findings;
  });
  assert.deepEqual(violations, []);
});

test('uma folha local é importada pelo dono sem módulo intermediário', () => {
  const wrappers = sourceFiles(src).filter((path) => path.endsWith('.ts')).filter((file) => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    const statements = source.statements.filter((node) => !ts.isExportDeclaration(node) || node.moduleSpecifier);
    if (statements.length !== 1) return false;
    const [statement] = statements;
    return ts.isImportDeclaration(statement) && !statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text.endsWith('.css');
  });
  assert.deepEqual(wrappers.map((file) => file.slice(src.length)), []);
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
