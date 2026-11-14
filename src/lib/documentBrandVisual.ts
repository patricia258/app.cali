type BrandVisual = { color: string; dark: boolean };

const brandVisuals = new Map<string, BrandVisual>();

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}
function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function cssRgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

async function imageFromUrl(url: string) {
  const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!response.ok) throw new Error('logo unavailable');
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('logo decode failed'));
      image.src = objectUrl;
    });
    return image;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

export async function resolveDocumentBrandVisual(company: { id: string; display_name: string }, originalUrl: string): Promise<BrandVisual> {
  const cacheKey = JSON.stringify([company.id, originalUrl]);
  const cached = brandVisuals.get(cacheKey);
  if (cached) return cached;
  const fallback: BrandVisual = { color: '#F7F3EE', dark: false };
  if (!originalUrl) {
    brandVisuals.set(cacheKey, fallback);
    return fallback;
  }
  try {
    const image = await imageFromUrl(originalUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 56; canvas.height = 56;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.clearRect(0, 0, 56, 56);
    ctx.drawImage(image, 0, 0, 56, 56);
    const pixels = ctx.getImageData(0, 0, 56, 56);
    const samples: Array<[number, number, number, number]> = [];
    const edge = 7;
    for (let y = 0; y < 56; y += 1) {
      for (let x = 0; x < 56; x += 1) {
        if (!(x < edge || x >= 56 - edge || y < edge || y >= 56 - edge)) continue;
        const i = (y * 56 + x) * 4;
        const a = pixels.data[i + 3];
        if (a > 80) samples.push([pixels.data[i], pixels.data[i + 1], pixels.data[i + 2], a]);
      }
    }
    if (samples.length > 90) {
      const avg = samples.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [0, 0, 0]);
      const r = avg[0] / samples.length, g = avg[1] / samples.length, b = avg[2] / samples.length;
      const spread = samples.reduce((sum, p) => sum + Math.hypot(p[0] - r, p[1] - g, p[2] - b), 0) / samples.length;
      const sat = saturation(r, g, b), lum = luminance(r, g, b);
      if (spread < 42 && sat > 0.13 && lum > 0.055 && lum < 0.94) {
        const visual = { color: cssRgb(r, g, b), dark: lum < 0.48 };
        brandVisuals.set(cacheKey, visual);
        return visual;
      }
    }
    // Logos com fundo transparente ou branco usam a cor predominante da marca.
    const bins = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (let i = 0; i < pixels.data.length; i += 4) {
      const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
      if (pixels.data[i + 3] < 150 || saturation(r, g, b) < .18 || luminance(r, g, b) < .07 || luminance(r, g, b) > .88) continue;
      const bucket = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
      const item = bins.get(bucket) || { r: 0, g: 0, b: 0, count: 0 };
      item.r += r; item.g += g; item.b += b; item.count++;
      bins.set(bucket, item);
    }
    const main = [...bins.values()].sort((a, b) => b.count - a.count)[0];
    if (main && main.count >= 18) {
      const r = main.r / main.count, g = main.g / main.count, b = main.b / main.count;
      const visual = { color: cssRgb(r, g, b), dark: luminance(r, g, b) < .48 };
      brandVisuals.set(cacheKey, visual);
      return visual;
    }
  } catch (error) {
    console.warn('CALI document cover brand color', company.display_name, error);
  }
  brandVisuals.set(cacheKey, fallback);
  return fallback;
}
