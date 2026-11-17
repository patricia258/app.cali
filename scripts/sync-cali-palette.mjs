import { readFileSync, writeFileSync } from 'node:fs';

const stylesheet = new URL('../public/brand/color-palette.css', import.meta.url);
const resolved = new URL('../supabase/functions/_shared/cali-palette.ts', import.meta.url);
const index = new URL('../index.html', import.meta.url);
const channels = /--cali-palette-([a-z]+)-([a-z]+)-rgb:\s*(\d+) (\d+) (\d+);/g;
const themeColor = /(<meta\s+name="theme-color"\s+content=")[^"]+(")/;
const palette = {};

for (const [, family, tone, ...rgb] of readFileSync(stylesheet, 'utf8').matchAll(channels)) {
  const stops = palette[family] ??= {};
  if (tone in stops || rgb.some((value) => Number(value) > 255)) {
    throw new Error(`Canal inválido na paleta CALI em ${family}/${tone}`);
  }
  const hex = rgb.map((value) => Number(value).toString(16).padStart(2, '0')).join('');
  stops[tone] = `#${hex}`;
}

const brand = palette.burgundy?.base;
const html = readFileSync(index, 'utf8');
if (!brand || !themeColor.test(html)) throw new Error('Cor de marca ou metadado theme-color ausente.');

writeFileSync(resolved, `// Paleta estática gerada por scripts/sync-cali-palette.mjs.\nexport const caliPalette = ${JSON.stringify(palette, null, 2)} as const;\n`);
const updatedHtml = html.replace(themeColor, (_tag, start, end) => start + brand + end);
if (updatedHtml !== html) writeFileSync(index, updatedHtml);
