/* Generates src/v2/v2.generated.css from the approved V2 repository.
   The approved rules are copied byte for byte, in the reference bundle's cascade order, and only
   wrapped in a scope so they apply while the client workspace is mounted and never to the
   landing page, login or the administrator. Do not edit the output by hand: rerun this script.
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
const blocks = order.map(file => {
  let css = fs.readFileSync(path.join(source, 'src', file), 'utf8');
  css = css.replace(/@import\s+url\((['"])[^'"]+\1\)[^;]*;/g, rule => { imports.push(rule); return ''; });
  if (/@keyframes|@font-face/.test(css)) throw new Error(`${file}: regra que não pode ser aninhada; ajuste o gerador.`);
  css = css.replace(/(^|[{},])\s*:root(?=\s*[{,])/g, '$1&');
  return `/* ---- ${file} ---- */\n${css.trim()}`;
});
const out = `/* GERADO por scripts/port-v2-css.cjs — não editar.\n   Fonte: patricia258/cali-workspace-v2@${commit}\n   Arquivos, nesta ordem: ${order.join(', ')} */\n${[...new Set(imports)].join('\n')}\n${scope}{\n${blocks.join('\n')}\n}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'v2', 'v2.generated.css'), out);
console.log(`v2.generated.css: ${out.length} bytes de ${commit.slice(0, 7)}`);
