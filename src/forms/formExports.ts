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

/** Cartão 1080×1350 (formato de post/story) com a identidade CALI, o título, o QR Code e o link. */
export async function downloadShareCard(title: string, url: string, filename: string) {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#5A1E2D'; context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = 'rgba(255,255,255,.05)'; context.beginPath(); context.arc(1010, 120, 300, 0, Math.PI * 2); context.fill();
  try { const logo = await loadImage('/brand/cali-logo-light.svg'); const h = 64; context.drawImage(logo, 90, 90, (logo.width / logo.height) * h || 160, h); } catch { /* sem logo: segue só com o texto */ }
  context.fillStyle = '#D9B98A'; context.font = '700 26px Inter, Arial, sans-serif'; context.fillText('FORMULÁRIO', 90, 250);
  context.fillStyle = '#FFFFFF'; context.font = '400 66px Georgia, serif';
  wrap(context, title, 900, 3).forEach((line, index) => context.fillText(line, 90, 335 + index * 78));
  const qr = await loadImage(await qrDataUrl(url, 560));
  context.fillStyle = '#FFFFFF'; context.beginPath(); context.roundRect(250, 600, 580, 580, 36); context.fill();
  context.drawImage(qr, 280, 630, 520, 520);
  context.fillStyle = '#F3E9E1'; context.font = '600 30px Inter, Arial, sans-serif'; context.textAlign = 'center';
  context.fillText('Aponte a câmera do celular para responder', 540, 1240);
  context.fillStyle = '#D9B98A'; context.font = '500 26px Inter, Arial, sans-serif'; context.fillText(url.replace(/^https?:\/\//, ''), 540, 1290);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) download(blob, filename);
}

export async function downloadQrPng(url: string, filename: string) {
  const data = await qrDataUrl(url, 1024);
  download(await (await fetch(data)).blob(), filename);
}
