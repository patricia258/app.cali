import assert from 'node:assert/strict';
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
