export type ImageUploadPreset = 'avatar' | 'signature' | 'company-logo' | 'attachment';

type Preset = { maxSide: number; maxBytes: number; quality: number };

const PRESETS: Record<ImageUploadPreset, Preset> = {
  avatar: { maxSide: 768, maxBytes: 450 * 1024, quality: 0.84 },
  signature: { maxSide: 1400, maxBytes: 650 * 1024, quality: 0.86 },
  'company-logo': { maxSide: 1200, maxBytes: 700 * 1024, quality: 0.88 },
  attachment: { maxSide: 2200, maxBytes: 2 * 1024 * 1024, quality: 0.84 },
};

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler essa imagem.')); };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar essa imagem.')), 'image/webp', quality);
  });
}

export async function optimizeImageForUpload(file: File, presetName: ImageUploadPreset) {
  if (!SUPPORTED_TYPES.has(file.type)) throw new Error('Use uma imagem JPG, PNG, WEBP ou SVG.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem original deve ter no máximo 12 MB.');

  const preset = PRESETS[presetName];
  const image = await loadImage(file);
  const naturalWidth = Math.max(1, image.naturalWidth || image.width);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height);
  const scale = Math.min(1, preset.maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu processar essa imagem.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasBlob(canvas, preset.quality);
  if (blob.size > preset.maxBytes) blob = await canvasBlob(canvas, Math.max(0.62, preset.quality - 0.12));
  if (blob.size > preset.maxBytes) throw new Error('Não foi possível reduzir a imagem a um tamanho seguro.');
  return { blob, contentType: 'image/webp', extension: 'webp', width, height };
}
