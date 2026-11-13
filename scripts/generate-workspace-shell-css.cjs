/* Generates the approved V2 workspace CSS, preserving declaration order and converting
   equivalent common declarations to Tailwind utilities.
   Usage: node scripts/generate-workspace-shell-css.cjs <path-to-cali-workspace-v2> [revision] > /tmp/cali-workspace-reference.css */
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { useUtilities } = require('./css-utilities.cjs');
const source = process.argv[2];
if (!source) throw new Error('Informe o caminho do repositório cali-workspace-v2.');
const order = ['styles.css', 'client-home.css', 'notices.css', 'indicator-extras.css', 'deliverables.css', 'team-enhancements.css', 'workflows.css'];
const git = (...args) => execFileSync('git', args, { cwd: source, encoding: 'utf8', maxBuffer: 1 << 26 });
const commit = git('rev-parse', '--verify', '--end-of-options', (process.argv[3] || 'HEAD') + '^{commit}').trim();
const scope = "html[data-workspace-ui='v2']";
const imports = [];
/* A administradora usa a mesma identidade; as regras próprias dela vêm do protótipo aprovado como direção,
   que vive em outra branch do mesmo repositório. */
const adminBranch = 'origin/feat/admin-v2-design-prototype-20261009';
const adminOrder = ['admin-preview.css', 'project-admin-dialogs.css'];
const adminCommit = git('rev-parse', '--verify', adminBranch).trim();
const read = (file) => git('show', `${adminOrder.includes(file) ? adminCommit : commit}:src/${file}`);
const blocks = [...order, ...adminOrder].map(file => {
  let css = read(file);
  css = css.replace(/@import\s+url\((['"])[^'"]+\1\)[^;]*;/g, rule => { imports.push(rule); return ''; });
  if (/@keyframes|@font-face/.test(css)) throw new Error(`${file}: regra que não pode ser aninhada; ajuste o gerador.`);
  css = css.replace(/(^|[{},])\s*:root(?=\s*[{,])/g, '$1&');
  return `/* ---- ${file} ---- */\n${useUtilities(css.trim()).css}`;
});
const out = `/* GERADO por scripts/generate-workspace-shell-css.cjs — não editar.\n   Fonte: patricia258/cali-workspace-v2@${commit}\n   Arquivos, nesta ordem: ${order.join(', ')}\n   Administradora: ${adminBranch}@${adminCommit} — ${adminOrder.join(', ')} */\n${[...new Set(imports)].join('\n')}\n@reference "../../styles/tailwind.css";\n${scope}{\n${blocks.join('\n')}\n}\n`;
fs.writeSync(process.stdout.fd, out);
