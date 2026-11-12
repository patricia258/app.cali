import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../..', import.meta.url));
const files = ['src', 'api'].flatMap(directory => readdirSync(resolve(root, directory), { recursive: true })
  .filter(file => /\.(?:ts|tsx|js|jsx)$/.test(file))
  .map(file => `${directory}/${file}`));
const calls = new Map();
const unknown = [];
const dispatchers = new Set([
  'src/modules/disc/GestaoPage.tsx',
  'src/api/calendar/requests.ts',
]);
const revoked = 'cali_workspace.client_request_online_extra_v1';

function rpcNames(node, source) {
  if (!node) return [];
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isConditionalExpression(node)) return [...rpcNames(node.whenTrue, source), ...rpcNames(node.whenFalse, source)];
  if (ts.isIdentifier(node) && node.text === 'fn') {
    let scope = node.parent;
    while (scope && !ts.isFunctionLike(scope)) scope = scope.parent;
    const declaration = scope?.body?.statements?.flatMap(statement => statement.declarationList?.declarations ?? [])
      .find(variable => variable.name.getText(source) === node.text);
    return rpcNames(declaration?.initializer, source);
  }
  return [];
}

function rpcArguments(node) {
  if (!node) return [];
  if (!ts.isObjectLiteralExpression(node)) return null;
  if (node.properties.some(property => !property.name || ts.isComputedPropertyName(property.name))) return null;
  return node.properties.map(property => property.name.text).sort();
}

for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const method = ts.isPropertyAccessExpression(expression) ? expression.name.text : expression.getText(source);
      if (method === 'rpc' || method === 'anonPublicRpc') {
        const names = rpcNames(node.arguments[0], source);
        const receiver = ts.isPropertyAccessExpression(expression) ? expression.expression.getText(source) : '';
        const role = method === 'anonPublicRpc' ? 'anon' : 'authenticated';
        const schema = role === 'anon' || /\.schema\(['"]public['"]\)|\bpublic(?:Db|Supabase)\b/.test(receiver) ? 'public' : 'cali_workspace';
        const args = rpcArguments(node.arguments[1]);
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        if (names.length === 0 && !(dispatchers.has(file) && node.arguments[0]?.getText(source) === 'name')) {
          unknown.push(`${file}:${line}`);
        }
        for (const name of names) {
          const key = JSON.stringify([role, schema, name, args]);
          if (!calls.has(key)) calls.set(key, {
            role, schema, name, args, file: `${file}:${line}`, revoked: `${schema}.${name}` === revoked,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (unknown.length) throw Error(`Resolva a origem dos RPCs dinâmicos: ${unknown.join(', ')}`);
const contracts = [...calls.values()].sort((first, second) => first.name.localeCompare(second.name));
if (process.argv.includes('--list')) {
  console.log(JSON.stringify(contracts, null, 2));
} else {
  console.log(`do $frontend_rpc_catalog$
  declare
    missing text;
    calls jsonb := $inventory$${JSON.stringify(contracts)}$inventory$;
  begin
    select string_agg(format('%s %s.%s %s (%s)', e.role,e.schema,e.name,coalesce(e.args::text,'parâmetros dinâmicos'),e.file), E'\\n' order by e.name)
    into missing
    from jsonb_to_recordset(calls) as e(role text,schema text,name text,args jsonb,file text,revoked boolean)
    where not exists (
      select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      cross join lateral (
        select coalesce(array_agg(a.name order by a.position),array[]::text[]) names
        from unnest(p.proargnames) with ordinality as a(name,position)
        where coalesce(p.proargmodes[a.position], 'i') in ('i','b','v')
      ) input
      where n.nspname=e.schema and p.proname=e.name and p.prokind='f'
        and has_function_privilege(e.role,p.oid,'EXECUTE') = (not e.revoked)
        and has_schema_privilege(e.role,n.oid,'USAGE')
        and (e.args is null or (
          array(select jsonb_array_elements_text(e.args)) <@ input.names
          and input.names[1:p.pronargs-p.pronargdefaults] <@ array(select jsonb_array_elements_text(e.args))
        ))
    );
    if missing is not null then raise exception 'Contratos RPC divergentes:%', E'\\n'||missing; end if;
    raise notice '% chamadas distintas no catálogo (papel, schema, RPC e argumentos)', jsonb_array_length(calls);
  end;
  $frontend_rpc_catalog$;`);
}
