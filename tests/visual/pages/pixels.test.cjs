'use strict';

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { PNG } = createRequire(require.resolve('qrcode'))('pngjs');
const { comparePixels, threshold } = require('./pixels.cjs');

function png(width, height, pixels) {
  const image = new PNG({ width, height });
  image.data.set(pixels.flatMap((red) => [red, 0, 0, 255]));
  return PNG.sync.write(image);
}

test('compara imagens idênticas sem gerar diff', () => {
  const original = png(2, 1, [25, 50]);
  assert.deepEqual(comparePixels(original, original), {
    dimensions: [
      [2, 1],
      [2, 1],
    ],
    changedPixels: 0,
    exactChangedPixels: 0,
    changedPercent: 0,
    bounds: null,
  });
});

test('mede a mudança exata e marca apenas pixels acima do limiar', () => {
  const reference = png(2, 1, [0, 0]);
  const candidate = png(2, 1, [threshold - 1, threshold]);
  const result = comparePixels(reference, candidate);
  assert.equal(result.changedPixels, 1);
  assert.equal(result.exactChangedPixels, 2);
  assert.equal(result.changedPercent, 50);
  assert.deepEqual(result.bounds, { left: 1, right: 1, top: 0, bottom: 0 });
  assert.deepEqual([...PNG.sync.read(result.overlay).data.subarray(4, 8)], [207, 18, 119, 255]);
});

test('normaliza dimensões diferentes pela união de pixels', () => {
  const result = comparePixels(png(2, 1, [0, 0]), png(1, 2, [0, 0]));
  assert.deepEqual(result.dimensions, [
    [2, 1],
    [1, 2],
  ]);
  assert.equal(result.changedPixels, 2);
  assert.equal(result.changedPercent, 66.6667);
  assert.deepEqual(result.bounds, { left: 0, right: 1, top: 0, bottom: 1 });
});
