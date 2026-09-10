export type ImageUploadOptimizationOptions = {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  outputType?: 'image/webp' | 'image/jpeg';
};

function optimizedName(name: string, outputType: 'image/webp' | 'image/jpeg') {
  const stem = name.replace(/\.[^.]+$/, '') || 'imagem';
  return `${stem}.${outputType === 'image/jpeg' ? 'jpg' : 'webp'}`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não consegui preparar essa imagem.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function optimizeImageBeforeUpload(
  file: File,
  { maxWidth, maxHeight, quality = 0.82, outputType = 'image/webp' }: ImageUploadOptimizationOptions,
): Promise<File> {
  if (typeof document === 'undefined' || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;

  const image = await loadImage(file);
  const width = Math.max(1, image.naturalWidth || image.width);
  const height = Math.max(1, image.naturalHeight || image.height);
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return file;
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, outputType, quality);
  if (!blob) return file;

  // Nunca troca uma imagem pequena por uma versão maior apenas por converter o formato.
  if (scale === 1 && blob.size >= file.size) return file;

  return new File([blob], optimizedName(file.name, outputType), {
    type: outputType,
    lastModified: Date.now(),
  });
}
