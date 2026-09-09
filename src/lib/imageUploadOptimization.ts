export type WorkspaceImageKind = 'avatar' | 'logo';

type OptimizeOptions = {
  maxSide: number;
  targetBytes: number;
  initialQuality: number;
  minQuality: number;
};

const OPTIONS: Record<WorkspaceImageKind, OptimizeOptions> = {
  avatar: { maxSide: 720, targetBytes: 420 * 1024, initialQuality: 0.84, minQuality: 0.68 },
  logo: { maxSide: 1600, targetBytes: 700 * 1024, initialQuality: 0.9, minQuality: 0.74 },
};

export const workspaceImageGuidance = {
  avatar: 'JPG, PNG ou WEBP · até 5 MB · o Workspace otimiza automaticamente',
  logo: 'SVG, JPG, PNG ou WEBP · até 3 MB · o Workspace otimiza automaticamente',
};

function extensionless(name: string) {
  return name.replace(/\.[^.]+$/, '') || 'imagem';
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível otimizar a imagem.')), 'image/webp', quality);
  });
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível ler a imagem enviada.'));
      image.src = url;
    });
    return image;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function optimizeWorkspaceImage(file: File, kind: WorkspaceImageKind) {
  if (kind === 'logo' && (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'))) {
    if (file.size > 3 * 1024 * 1024) throw new Error('A logo deve ter no máximo 3 MB.');
    return file;
  }

  const accepted = ['image/jpeg', 'image/png', 'image/webp'];
  if (!accepted.includes(file.type)) {
    throw new Error(kind === 'avatar' ? 'Use uma foto JPG, PNG ou WEBP.' : 'Use uma logo SVG, JPG, PNG ou WEBP.');
  }

  const inputLimit = kind === 'avatar' ? 5 * 1024 * 1024 : 3 * 1024 * 1024;
  if (file.size > inputLimit) {
    throw new Error(kind === 'avatar' ? 'A foto deve ter no máximo 5 MB.' : 'A logo deve ter no máximo 3 MB.');
  }

  const image = await loadImage(file);
  const naturalWidth = Math.max(1, image.naturalWidth || image.width);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height);
  const options = OPTIONS[kind];
  const scale = Math.min(1, options.maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu otimizar a imagem.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = options.initialQuality;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > options.targetBytes && quality > options.minQuality) {
    quality = Math.max(options.minQuality, quality - 0.06);
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size >= file.size && scale === 1 && file.type === 'image/webp') return file;
  return new File([blob], `${extensionless(file.name)}.webp`, { type: 'image/webp', lastModified: Date.now() });
}
