import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { paletteColorWithAlpha } from '../../src/lib/paletteColorWithAlpha.ts';
import { caliPalette } from '../../supabase/functions/_shared/cali-palette.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const declarations = /--cali-palette-([a-z]+)-([a-z]+)-rgb:\s*(\d+) (\d+) (\d+);/g;
const shades = ['lightest', 'lighter', 'light', 'base', 'dark', 'darker', 'darkest'];

function listSource(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listSource(path) : /\.(?:css|html|tsx?|[cm]?js)$/.test(entry.name) ? [path] : [];
  });
}

test('paleta do navegador e das saídas estáticas usa os mesmos tons nomeados', () => {
  const stylesheet = readFileSync(join(root, 'public/brand/color-palette.css'), 'utf8');
  const actual = {};
  for (const [, family, tone, ...values] of stylesheet.matchAll(declarations)) {
    const stops = actual[family] ??= {};
    const rgb = values.map(Number);
    assert.ok(rgb.every((channel) => channel >= 0 && channel <= 255));
    assert.equal(stops[tone], undefined, `${family}/${tone}`);
    stops[tone] = `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }
  assert.deepEqual(actual, caliPalette);
  for (const stops of Object.values(actual)) {
    const names = Object.keys(stops);
    assert.ok(names.length <= 7);
    assert.deepEqual(names, shades.filter((tone) => tone in stops));
    const lightness = names.map((tone) => {
      const hex = stops[tone];
      const rgb = [1, 3, 5].map((offset) => {
        const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    });
    assert.ok(lightness.every((value, index) => index === 0 || value < lightness[index - 1]));
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const themeColor = /<meta\s+name="theme-color"\s+content="([^"]+)"/.exec(html)?.[1]?.toLowerCase();
  assert.equal(themeColor, caliPalette.burgundy.base);
  assert.equal(paletteColorWithAlpha(caliPalette.burgundy.base, 0.12), 'rgba(90, 30, 45, 0.12)');
});

test('fontes de interface e Edge usam a paleta para cores declaradas', () => {
  const directHex = /(?<![\\/%&a-z0-9-])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})(?![a-z0-9-])/i;
  const directFunction = /(?:rgba?|hsla?|hwb|oklab|oklch|lab|lch)\(\s*\d+(?:[ ,./%]+\d+)/i;
  const defaultTailwindColor = /tw:(?:[\w-]+:)*(?:text|bg|ring|outline|border|from|via|to|stroke|fill|shadow)-(?:white|black|(?:amber|blue|cyan|emerald|fuchsia|gray|green|indigo|lime|neutral|orange|pink|purple|red|rose|sky|slate|stone|teal|violet|yellow|zinc)-\d+)(?![\w-])/;
  const files = [
    ...listSource(join(root, 'src')),
    ...listSource(join(root, 'api')),
    ...listSource(join(root, 'supabase/functions')),
    ...listSource(join(root, 'public/portal-legacy')),
  ];
  const resolvedPalette = join(root, 'supabase/functions/_shared/cali-palette.ts');
  const violations = files.filter((path) => {
    if (path === resolvedPalette) return false;
    const source = readFileSync(path, 'utf8');
    return directHex.test(source) || directFunction.test(source) || defaultTailwindColor.test(source);
  });
  assert.deepEqual(violations, []);
});
