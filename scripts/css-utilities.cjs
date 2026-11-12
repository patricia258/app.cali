const { createRequire } = require('node:module');
const postcss = createRequire(require.resolve('vite'))('postcss');

const keywordUtilities = {
  display: {
    block: 'block', inline: 'inline', 'inline-block': 'inline-block', flex: 'flex',
    'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid', none: 'hidden',
    contents: 'contents', table: 'table', 'table-cell': 'table-cell',
  },
  position: { static: 'static', relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky' },
  'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
  'flex-direction': { row: 'flex-row', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' },
  'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' },
  'align-items': { center: 'items-center', 'flex-start': 'items-start', 'flex-end': 'items-end', stretch: 'items-stretch', baseline: 'items-baseline' },
  'justify-content': {
    center: 'justify-center', 'flex-start': 'justify-start', 'flex-end': 'justify-end',
    'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly',
  },
  'place-items': { center: 'place-items-center', start: 'place-items-start', end: 'place-items-end', stretch: 'place-items-stretch' },
  'text-align': { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' },
  'text-overflow': { ellipsis: 'text-ellipsis', clip: 'text-clip' },
  'white-space': { normal: 'whitespace-normal', nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-wrap': 'whitespace-pre-wrap', 'pre-line': 'whitespace-pre-line' },
  'text-transform': { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' },
  'pointer-events': { none: 'pointer-events-none', auto: 'pointer-events-auto' },
  visibility: { hidden: 'invisible', visible: 'visible' },
  cursor: { auto: 'cursor-auto', default: 'cursor-default', pointer: 'cursor-pointer', wait: 'cursor-wait', 'not-allowed': 'cursor-not-allowed' },
};

const measurements = {
  width: 'w', 'min-width': 'min-w', 'max-width': 'max-w',
  height: 'h', 'min-height': 'min-h', 'max-height': 'max-h',
  gap: 'gap', 'row-gap': 'gap-y', 'column-gap': 'gap-x',
  padding: 'p', 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl',
  margin: 'm', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml',
  'border-radius': 'rounded',
};

const palette = {
  '#5a1e2d': 'cali-brand', '#b58c52': 'cali-gold', '#fffdf9': 'cali-paper', '#2b2b2b': 'cali-ink',
  '#f7f3ee': 'cali-day-canvas', '#746d68': 'cali-day-muted', '#fff': 'white', '#ffffff': 'white',
};

function utilityFor(property, value) {
  const keyword = keywordUtilities[property]?.[value];
  if (keyword) return keyword;
  if (/^overflow(?:-[xy])?$/.test(property) && /^(auto|hidden|clip|visible|scroll)$/.test(value)) {
    return `${property}-${value}`;
  }
  if ((property === 'flex-shrink' || property === 'flex-grow') && /^[01]$/.test(value)) {
    const part = property.slice(5);
    return value === '0' ? part + '-0' : part;
  }
  const paletteName = palette[value.toLowerCase()];
  const colorPrefix = { color: 'text', 'background-color': 'bg', 'border-color': 'border' }[property];
  if (colorPrefix && paletteName) return `${colorPrefix}-${paletteName}`;
  const measurement = measurements[property];
  if (measurement && /^(0|\d+(?:\.\d+)?(?:px|rem|%|vw|vh|dvh))$/.test(value)) {
    if (property === 'border-radius' && value === '0') return 'rounded-none';
    return value === '0' ? `${measurement}-0` : `${measurement}-[${value}]`;
  }
}

function useUtilities(css, eligible = () => true) {
  const root = postcss.parse(css);
  let converted = 0;
  root.walkDecls((declaration) => {
    if (declaration.parent.type !== 'rule') return;
    for (let ancestor = declaration.parent.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.type === 'atrule' && ancestor.name.endsWith('keyframes')) return;
    }
    const { prop, value, important } = declaration;
    if (!eligible(prop, value)) return;
    const utility = utilityFor(prop, value);
    if (!utility) return;
    const apply = postcss.atRule({
      name: 'apply',
      params: `tw:${utility}${important ? '!' : ''}`,
      raws: { before: declaration.raws.before, afterName: ' ' },
    });
    declaration.replaceWith(apply);
    converted++;
  });
  return { css: root.toString(), converted };
}

module.exports = { useUtilities, utilityFor };
