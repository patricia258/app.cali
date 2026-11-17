'use strict';

const { createRequire } = require('node:module');

// QRCode already ships a pinned PNG decoder in the repository lockfile.
const { PNG } = createRequire(require.resolve('qrcode'))('pngjs');
const threshold = 24;

function comparePixels(before, after) {
  const reference = PNG.sync.read(before);
  if (before.equals(after)) {
    const size = [reference.width, reference.height];
    return { dimensions: [size, size], changedPixels: 0, exactChangedPixels: 0, changedPercent: 0, bounds: null };
  }
  const candidate = PNG.sync.read(after);
  const width = Math.max(reference.width, candidate.width);
  const height = Math.max(reference.height, candidate.height);
  const dimensions = [
    [reference.width, reference.height],
    [candidate.width, candidate.height],
  ];
  const overlay = new PNG({ width, height });
  let changedPixels = 0;
  let exactChangedPixels = 0;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const hasReference = x < reference.width && y < reference.height;
      const hasCandidate = x < candidate.width && y < candidate.height;
      if (!hasReference && !hasCandidate) continue;
      const a = (y * reference.width + x) * 4;
      const b = (y * candidate.width + x) * 4;
      const target = (y * width + x) * 4;
      const channelDifference =
        !hasReference || !hasCandidate
          ? 255
          : Math.max(
              Math.abs(reference.data[a] - candidate.data[b]),
              Math.abs(reference.data[a + 1] - candidate.data[b + 1]),
              Math.abs(reference.data[a + 2] - candidate.data[b + 2]),
              Math.abs(reference.data[a + 3] - candidate.data[b + 3]),
            );
      if (channelDifference > 0) exactChangedPixels++;
      const changed = channelDifference >= threshold;
      if (changed) {
        changedPixels++;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        overlay.data[target] = 207;
        overlay.data[target + 1] = 18;
        overlay.data[target + 2] = 119;
      } else {
        const gray = Math.round((candidate.data[b] + candidate.data[b + 1] + candidate.data[b + 2]) / 6 + 110);
        overlay.data.fill(gray, target, target + 3);
      }
      overlay.data[target + 3] = 255;
    }
  }
  const total =
    reference.width * reference.height +
    candidate.width * candidate.height -
    Math.min(reference.width, candidate.width) * Math.min(reference.height, candidate.height);
  return {
    dimensions,
    changedPixels,
    exactChangedPixels,
    changedPercent: Math.round((changedPixels / total) * 1e6) / 1e4,
    bounds: changedPixels ? { left, right, top, bottom } : null,
    ...(changedPixels ? { overlay: PNG.sync.write(overlay) } : {}),
  };
}

module.exports = { comparePixels, threshold };
