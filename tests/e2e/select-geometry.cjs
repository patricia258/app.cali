'use strict';

const assert = require('node:assert/strict');

async function assertSelectInsets(select) {
  const geometry = await select.evaluate((element) => {
    const style = getComputedStyle(element);
    const offset = style.backgroundPositionX.match(/^right\s+([\d.]+)px$/)
      ?? style.backgroundPositionX.match(/^calc\(100% - ([\d.]+)px\)$/);
    return {
      appearance: style.appearance,
      image: style.backgroundImage,
      start: parseFloat(style.paddingInlineStart),
      end: parseFloat(style.paddingInlineEnd),
      arrow: Number(offset?.[1]),
      arrowWidth: parseFloat(style.backgroundSize),
    };
  });
  assert.equal(geometry.appearance, 'none');
  assert.notEqual(geometry.image, 'none');
  assert.ok(geometry.start > 0 && Math.abs(geometry.start - geometry.arrow) < 0.25, JSON.stringify(geometry));
  assert.ok(geometry.end > geometry.arrow + geometry.arrowWidth, JSON.stringify(geometry));
}

module.exports = { assertSelectInsets };
