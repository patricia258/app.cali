/* Generates src/v2/v2.generated.css from the approved V2 repository.
   The approved rules are copied byte for byte, in the reference bundle's cascade order, and only
   wrapped in a scope so they apply while a V2 workspace route is mounted and never to the
   landing page, login or the administrator pages not yet migrated. Do not edit the output by hand: rerun this script.
   Usage: node scripts/port-v2-css.cjs <path-to-cali-workspace-v2> */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const source = process.argv[2];
if (!source) throw new Error('Informe o caminho do repositório cali-workspace-v2.');
const order = ['styles.css', 'client-home.css', 'notices.css', 'indicator-extras.css', 'deliverables.css', 'team-enhancements.css', 'workflows.css'];
const commit = execSync('git rev-parse HEAD', { cwd: source }).toString().trim();
const scope = "html[data-workspace-ui='v2']";
const imports = [];
/* A administradora usa a mesma identidade; as regras próprias dela vêm do protótipo aprovado como direção,
   que vive em outra branch do mesmo repositório. */
const adminBranch = 'origin/feat/admin-v2-design-prototype-20261009';
const adminOrder = ['admin-preview.css', 'project-admin-dialogs.css'];
const adminCommit = execSync(`git rev-parse ${adminBranch}`, { cwd: source }).toString().trim();
const read = file => adminOrder.includes(file)
  ? execSync(`git show ${adminCommit}:src/${file}`, { cwd: source, maxBuffer: 1 << 26 }).toString()
  : fs.readFileSync(path.join(source, 'src', file), 'utf8');
const blocks = [...order, ...adminOrder].map(file => {
  let css = read(file);
  css = css.replace(/@import\s+url\((['"])[^'"]+\1\)[^;]*;/g, rule => { imports.push(rule); return ''; });
  if (/@keyframes|@font-face/.test(css)) throw new Error(`${file}: regra que não pode ser aninhada; ajuste o gerador.`);
  css = css.replace(/(^|[{},])\s*:root(?=\s*[{,])/g, '$1&');
  return `/* ---- ${file} ---- */\n${css.trim()}`;
});
const out = `/* GERADO por scripts/port-v2-css.cjs — não editar.\n   Fonte: patricia258/cali-workspace-v2@${commit}\n   Arquivos, nesta ordem: ${order.join(', ')}\n   Administradora: ${adminBranch}@${adminCommit} — ${adminOrder.join(', ')} */\n${[...new Set(imports)].join('\n')}\n${scope}{\n${blocks.join('\n')}\n}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'v2', 'v2.generated.css'), out);
console.log(`v2.generated.css: ${out.length} bytes de ${commit.slice(0, 7)}`);
