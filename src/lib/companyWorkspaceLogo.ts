import { supabase } from '../api/supabase';
import { resolveWorkspaceMedia, workspaceMediaSignal } from './workspaceMedia';

export type CompanyLogoRecord = {
  id: string;
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
  logo_workspace_generated_at?: string | null;
  status?: string | null;
};

const WORKSPACE_BG = '#F7F3EE';
const WORKSPACE_MARK = '#5A1E2D';
const TILE_SIZE = 256;
const STYLE_VERSION = 1;
type CompanyLogoRegistry = {
  byId: Map<string, { raw: string; resolved: string; name: string }>;
  byName: Map<string, { raw: string; resolved: string; id: string }>;
};
type RegistryState = { cache?: { value: CompanyLogoRegistry; expiresAt: number }; pending?: Promise<CompanyLogoRegistry> };
const registries = new WeakMap<AbortSignal, RegistryState>();
const ensureQueues = new WeakMap<AbortSignal, Promise<unknown>>();

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'logo';
}

export async function resolveCompanyAsset(raw?: string | null, expiresIn = 3600) {
  return resolveWorkspaceMedia(raw, expiresIn);
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível ler a logo enviada.'));
      image.src = url;
    });
    return image;
  } finally {
    // The image has already decoded by this point; browsers keep its pixels alive.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function cornerBackground(data: ImageData) {
  const { width, height } = data;
  const points: Array<{ r: number; g: number; b: number; a: number }> = [];
  const sample = Math.max(2, Math.min(10, Math.floor(Math.min(width, height) * 0.04)));
  const corners = [
    [0, 0], [Math.max(0, width - sample), 0],
    [0, Math.max(0, height - sample)], [Math.max(0, width - sample), Math.max(0, height - sample)],
  ];
  for (const [sx, sy] of corners) {
    for (let y = sy; y < Math.min(height, sy + sample); y += 1) {
      for (let x = sx; x < Math.min(width, sx + sample); x += 1) {
        const i = (y * width + x) * 4;
        points.push({ r: data.data[i], g: data.data[i + 1], b: data.data[i + 2], a: data.data[i + 3] });
      }
    }
  }
  if (!points.length) return { transparent: true, reliable: false, r: 255, g: 255, b: 255 };
  const visible = points.filter((p) => p.a > 24);
  if (visible.length < points.length * 0.35) return { transparent: true, reliable: true, r: 255, g: 255, b: 255 };
  const avg = visible.reduce((sum, p) => ({ r: sum.r + p.r, g: sum.g + p.g, b: sum.b + p.b }), { r: 0, g: 0, b: 0 });
  avg.r /= visible.length; avg.g /= visible.length; avg.b /= visible.length;
  const spread = visible.reduce((sum, p) => sum + colorDistance(p, avg), 0) / visible.length;
  return { transparent: false, reliable: spread < 34, r: avg.r, g: avg.g, b: avg.b };
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível gerar a versão Workspace da logo.')), 'image/png', 0.95);
  });
}

export async function createWorkspaceLogoBlob(source: Blob): Promise<Blob> {
  const image = await blobToImage(source);
  const naturalWidth = Math.max(1, image.naturalWidth || image.width || TILE_SIZE);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height || TILE_SIZE);
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('Seu navegador não conseguiu processar a logo.');
  sourceCtx.clearRect(0, 0, width, height);
  sourceCtx.drawImage(image, 0, 0, width, height);
  const pixels = sourceCtx.getImageData(0, 0, width, height);
  const background = cornerBackground(pixels);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) throw new Error('Seu navegador não conseguiu tratar a logo.');
  const output = maskCtx.createImageData(width, height);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const a = pixels.data[i + 3] / 255;
      if (a <= 0.02) continue;
      const p = { r: pixels.data[i], g: pixels.data[i + 1], b: pixels.data[i + 2] };
      let strength = a;
      if (!background.transparent && background.reliable) {
        const dist = colorDistance(p, background);
        strength = a * clamp((dist - 8) / 74);
      }
      if (strength <= 0.055) continue;
      output.data[i] = p.r;
      output.data[i + 1] = p.g;
      output.data[i + 2] = p.b;
      output.data[i + 3] = Math.round(255 * strength);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }

  // If background removal made the logo disappear, fall back to the original alpha channel.
  if (maxX < minX || maxY < minY) {
    minX = width; minY = height; maxX = -1; maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const a = pixels.data[i + 3] / 255;
        if (a <= 0.05) continue;
        output.data[i] = pixels.data[i]; output.data[i + 1] = pixels.data[i + 1]; output.data[i + 2] = pixels.data[i + 2]; output.data[i + 3] = Math.round(255 * a);
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  maskCtx.putImageData(output, 0, 0);

  const tile = document.createElement('canvas');
  tile.width = TILE_SIZE;
  tile.height = TILE_SIZE;
  const ctx = tile.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu finalizar a logo.');
  ctx.fillStyle = WORKSPACE_BG;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  if (maxX >= minX && maxY >= minY) {
    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);
    const padding = 38;
    const available = TILE_SIZE - padding * 2;
    const fit = Math.min(available / cropW, available / cropH);
    const drawW = cropW * fit;
    const drawH = cropH * fit;
    const dx = (TILE_SIZE - drawW) / 2;
    const dy = (TILE_SIZE - drawH) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(maskCanvas, minX, minY, cropW, cropH, dx, dy, drawW, drawH);
  }
  return canvasToBlob(tile);
}

export async function createWorkspaceLogoFromUrl(raw: string, signal: AbortSignal) {
  const url = await resolveCompanyAsset(raw, 900);
  signal.throwIfAborted();
  if (!url) throw new Error('Logo original indisponível.');
  const response = await fetch(url, { credentials: 'omit', signal });
  if (!response.ok) throw new Error('Não foi possível carregar a logo original.');
  return createWorkspaceLogoBlob(await response.blob());
}

export async function uploadWorkspaceLogo(company: CompanyLogoRecord, blob: Blob, signal: AbortSignal) {
  if (!supabase || signal.aborted) return '';
  const path = `${company.id}/brand/workspace-logo-v${STYLE_VERSION}-${Date.now()}-${safeName(company.display_name)}.png`;
  const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(path, blob, { contentType: 'image/png', upsert: false });
  if (signal.aborted) return '';
  if (uploadError) throw uploadError;
  const stored = `private:${path}`;
  const { error: updateError } = await supabase.from('companies').update({ logo_workspace_url: stored, logo_workspace_generated_at: new Date().toISOString() }).eq('id', company.id).abortSignal(signal);
  if (signal.aborted) return '';
  if (updateError) throw updateError;
  return stored;
}

export async function ensureCompanyWorkspaceLogo(company: CompanyLogoRecord, signal = workspaceMediaSignal()) {
  if (!signal || signal.aborted || !supabase) return '';
  if (!company.logo_url || company.logo_workspace_url) return company.logo_workspace_url || '';
  const client = supabase;
  const job = (ensureQueues.get(signal) ?? Promise.resolve()).then(async () => {
    if (signal.aborted) return '';
    const fresh = await client.from('companies').select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status')
      .eq('id', company.id).abortSignal(signal).maybeSingle();
    if (signal.aborted) return '';
    const row = fresh.data as CompanyLogoRecord | null;
    if (!row?.logo_url || row.logo_workspace_url) return row?.logo_workspace_url || '';
    const blob = await createWorkspaceLogoFromUrl(row.logo_url, signal);
    return uploadWorkspaceLogo(row, blob, signal);
  }).catch((error) => {
    if (!signal.aborted) console.warn('CALI workspace logo', company.display_name, error);
    return '';
  });
  ensureQueues.set(signal, job);
  return job;
}

export async function loadCompanyLogoRegistry(signal: AbortSignal): Promise<CompanyLogoRegistry> {
  const value: CompanyLogoRegistry = { byId: new Map(), byName: new Map() };
  if (!supabase || signal.aborted) return value;
  let state = registries.get(signal);
  if (!state) {
    state = {};
    registries.set(signal, state);
    signal.addEventListener('abort', () => registries.delete(signal), { once: true });
  }
  if (state.cache && state.cache.expiresAt > Date.now()) return state.cache.value;
  if (state.pending) return state.pending;

  const registry = state;
  registry.pending = (async () => {
    const result = await supabase.from('companies').select('id,display_name,logo_url,logo_workspace_url,status')
      .order('display_name').abortSignal(signal);
    if (!result.error) {
      for (const row of (result.data || []) as CompanyLogoRecord[]) {
        if (signal.aborted) return value;
        const raw = row.logo_url || row.logo_workspace_url || '';
        const resolved = raw ? await resolveCompanyAsset(raw) : '';
        value.byId.set(row.id, { raw, resolved, name: row.display_name });
        value.byName.set(row.display_name.trim().toLocaleLowerCase('pt-BR'), { raw, resolved, id: row.id });
      }
    }
    if (!signal.aborted) registry.cache = { value, expiresAt: Date.now() + 5_000 };
    return value;
  })().finally(() => {
    registry.pending = undefined;
  });

  return registry.pending;
}

export async function backfillWorkspaceLogos(limit: number, signal: AbortSignal) {
  if (!supabase || signal.aborted || !location.pathname.startsWith('/admin/')) return;
  const result = await supabase.from('companies').select('id,display_name,logo_url,logo_workspace_url,logo_workspace_generated_at,status').not('logo_url', 'is', null).is('logo_workspace_url', null).order('updated_at', { ascending: false }).limit(limit).abortSignal(signal);
  if (result.error || signal.aborted) return;
  for (const row of (result.data || []) as CompanyLogoRecord[]) {
    if (signal.aborted) break;
    await ensureCompanyWorkspaceLogo(row, signal);
  }
}

export const companyWorkspaceVisual = {
  background: WORKSPACE_BG,
  mark: WORKSPACE_MARK,
  version: STYLE_VERSION,
};
