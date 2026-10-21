/* CALI Forms: exportação Excel (.xlsx de verdade, uma aba) e cartão de compartilhamento com QR Code (PNG). */
import { strToU8, zipSync } from 'fflate';
import QRCode from 'qrcode';

const xml = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]!)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function columnName(index: number) {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Planilha simples: primeira linha em negrito (cabeçalho), números como número, o resto como texto. */
export function downloadXlsx(filename: string, sheetName: string, header: string[], rows: Array<Array<string | number>>) {
  const cell = (value: string | number, ref: string, bold: boolean) => typeof value === 'number' && Number.isFinite(value)
    ? `<c r="${ref}"${bold ? ' s="1"' : ''}><v>${value}</v></c>`
    : `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const all = [header, ...rows];
  const sheetRows = all.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(value, `${columnName(c)}${r + 1}`, r === 0)).join('')}</row>`).join('');
  const widths = header.map((_, c) => Math.min(60, Math.max(12, ...all.map((row) => String(row[c] ?? '').length + 2))));
  const cols = `<cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
  const safeSheet = xml(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Respostas');
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>'),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`),
  };
  download(new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export function qrDataUrl(url: string, size = 480) {
  return QRCode.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2B1A20', light: '#FFFFFF' } });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`; }
  return lines;
}

/** Pinta uma marca SVG (que usa currentColor) com uma cor ou degradê, num canvas à parte. */
async function tintedMark(src: string, size: number, paint: (context: CanvasRenderingContext2D) => void) {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, size, size);
  context.globalCompositeOperation = 'source-in';
  paint(context); context.fillRect(0, 0, size, size);
  return canvas;
}

function lines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const out: string[] = [];
  for (const paragraph of text.split(/\n+/).map((item) => item.trim()).filter(Boolean)) {
    if (out.length) out.push('');
    for (const line of wrap(context, paragraph, maxWidth, maxLines)) out.push(line);
    if (out.length >= maxLines) break;
  }
  if (out.length > maxLines) out.length = maxLines;
  return out;
}

/** Cartão 1080×1350 (post / grupos) com o DNA CALI: degradê bordô, lima dourada, logo e folha, categoria, título,
    introdução e o QR Code num painel claro. */
export async function downloadShareCard(card: { title: string; category: string; intro: string }, url: string, filename: string) {
  await Promise.all(['700 68px Inter', '600 30px Inter', '400 30px Inter'].map((font) => document.fonts?.load(font).catch(() => undefined)));
  const W = 1080, H = 1350, P = 90;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const context = canvas.getContext('2d')!;
  const bg = context.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#7A2840'); bg.addColorStop(0.55, '#5A1E2D'); bg.addColorStop(1, '#3A111C');
  context.fillStyle = bg; context.fillRect(0, 0, W, H);
  const glow = context.createRadialGradient(160, 120, 0, 160, 120, 620);
  glow.addColorStop(0, 'rgba(217,185,138,.22)'); glow.addColorStop(1, 'rgba(217,185,138,0)');
  context.fillStyle = glow; context.fillRect(0, 0, W, H);
  try {
    const lime = await tintedMark('/brand/cali-lime-mark.svg', 900, (ctx) => { const g = ctx.createLinearGradient(0, 0, 900, 900); g.addColorStop(0, 'rgba(217,185,138,.10)'); g.addColorStop(1, 'rgba(217,185,138,.02)'); ctx.fillStyle = g; });
    context.save(); context.translate(1010, 560); context.rotate(-0.18); context.drawImage(lime, -450, -450, 900, 900); context.restore();
  } catch { /* segue sem a lima */ }
  try { const logo = await loadImage('/brand/cali-logo-light.svg'); const h = 104; context.drawImage(logo, P, 78, (logo.width / logo.height) * h || 190, h); } catch { /* sem logo */ }
  try { const oak = await tintedMark('/brand/cali-oak-mark.svg', 120, (ctx) => { ctx.fillStyle = '#F3E9E1'; }); context.drawImage(oak, W - P - 104, 72, 104, 104); } catch { /* sem folha */ }

  let y = 300;
  context.fillStyle = '#D9B98A'; context.font = '700 26px Inter, Arial, sans-serif';
  (context as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '5px';
  context.fillText((card.category || 'Formulário').toUpperCase(), P, y);
  (context as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  context.fillStyle = '#FFFFFF'; context.font = '700 68px Inter, Arial, sans-serif';
  y += 84;
  for (const line of wrap(context, card.title, W - P * 2, 3)) { context.fillText(line, P, y); y += 80; }
  const intro = card.intro.trim();
  if (intro) {
    context.fillStyle = 'rgba(255,255,255,.82)'; context.font = '400 30px Inter, Arial, sans-serif';
    y += 16;
    const room = Math.max(1, Math.floor((860 - y) / 44));
    for (const line of lines(context, intro, W - P * 2 - 40, Math.min(7, room))) { if (line) context.fillText(line, P, y); y += line ? 44 : 18; }
  }

  const panelY = 900, panelH = 350;
  context.fillStyle = '#F7F3EE'; context.beginPath(); context.roundRect(P, panelY, W - P * 2, panelH, 34); context.fill();
  const qr = await loadImage(await qrDataUrl(url, 600));
  context.fillStyle = '#FFFFFF'; context.beginPath(); context.roundRect(P + 30, panelY + 30, 290, 290, 22); context.fill();
  context.drawImage(qr, P + 45, panelY + 45, 260, 260);
  const tx = P + 360;
  context.fillStyle = '#5A1E2D'; context.font = '700 36px Inter, Arial, sans-serif';
  context.fillText('Responda pelo celular', tx, panelY + 110);
  context.fillStyle = '#6B5D63'; context.font = '400 26px Inter, Arial, sans-serif';
  wrap(context, 'Aponte a câmera para o QR Code ou acesse o link:', W - P - tx - 30, 2).forEach((line, index) => context.fillText(line, tx, panelY + 160 + index * 36));
  context.fillStyle = '#7A1F3D'; context.font = '600 24px Inter, Arial, sans-serif';
  wrap(context, url.replace(/^https?:\/\//, ''), W - P - tx - 30, 2).forEach((line, index) => context.fillText(line, tx, panelY + 250 + index * 32));
  context.fillStyle = 'rgba(243,233,225,.7)'; context.font = '500 22px Inter, Arial, sans-serif'; context.textAlign = 'center';
  context.fillText('CALI RH  ·  HR for Business  ·  calirh.com', W / 2, H - 38);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) download(blob, filename);
}

export async function downloadQrPng(url: string, filename: string) {
  const data = await qrDataUrl(url, 1024);
  download(await (await fetch(data)).blob(), filename);
}
