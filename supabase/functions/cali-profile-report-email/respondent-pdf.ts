// Composição do PDF individual da V2, restrita ao processo privado de entrega.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';
import { STYLE_CONTENT, combinationOf, profileName, type Style } from '../../../src/modules/shared/disc/profileContent.ts';

export type RespondentPdfInput = {
  title: string;
  organization: string;
  protocol: string;
  createdAt: string;
  personName: string;
  primary: Style;
  secondary: Style;
  mixed: boolean;
  signer?: { full_name: string; job_title?: string | null } | null;
  avatar?: Uint8Array;
  signature?: Uint8Array;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 48;
const RIGHT = PAGE_WIDTH - LEFT;
const TOP = PAGE_HEIGHT - 103;
const BOTTOM = 67;
const BURGUNDY = rgb(0.353, 0.118, 0.176);
const GOLD = rgb(0.71, 0.549, 0.322);
const INK = rgb(0.169, 0.169, 0.169);
const MUTED = rgb(0.42, 0.38, 0.36);
const PAPER = rgb(0.984, 0.976, 0.961);
const RULE = rgb(0.89, 0.85, 0.81);

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; title: PDFFont };

function safeText(value: string, font: PDFFont): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(value.normalize('NFC'), (character) => {
    if (character === '\n' || character === '\r') return '\n';
    if (character === '\t') return ' ';
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && supported.has(codePoint)) return character;
    if (character === '\u2013' || character === '\u2014' || character === '\u2212') return '-';
    if (character === '\u2018' || character === '\u2019') return "'";
    if (character === '\u201c' || character === '\u201d') return '"';
    return '?';
  }).join('');
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = safeText(value, font);
  const output: string[] = [];
  for (const paragraph of safe.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      output.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) output.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      let fragment = '';
      for (const character of Array.from(word)) {
        const next = fragment + character;
        if (fragment && font.widthOfTextAtSize(next, size) > maxWidth) {
          output.push(fragment);
          fragment = character;
        } else {
          fragment = next;
        }
      }
      line = fragment;
    }
    if (line) output.push(line);
  }
  return output;
}

class DiscPdfWriter {
  readonly document: PDFDocument;
  readonly fonts: Fonts;
  readonly protocol: string;
  private page!: PDFPage;
  private y = TOP;
  private pageNumber = 0;

  constructor(document: PDFDocument, fonts: Fonts, protocol: string) {
    this.document = document;
    this.fonts = fonts;
    this.protocol = protocol;
    this.newPage();
  }

  private newPage(): void {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pageNumber += 1;
    this.y = TOP;
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });
    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 68,
      width: PAGE_WIDTH,
      height: 68,
      color: BURGUNDY,
    });
    this.page.drawText('CALI RH', {
      x: LEFT,
      y: PAGE_HEIGHT - 35,
      size: 16,
      font: this.fonts.bold,
      color: rgb(1, 1, 1),
    });
    this.page.drawText('[TESTE V2] Homologação sintética', {
      x: LEFT,
      y: PAGE_HEIGHT - 53,
      size: 8,
      font: this.fonts.regular,
      color: rgb(0.95, 0.87, 0.71),
    });
    this.page.drawLine({
      start: { x: LEFT, y: 49 },
      end: { x: RIGHT, y: 49 },
      thickness: 0.7,
      color: RULE,
    });
    this.page.drawText('CALI RH · calirh.com', {
      x: LEFT,
      y: 33,
      size: 8,
      font: this.fonts.regular,
      color: MUTED,
    });
    this.page.drawText(
      this.protocol
        ? `Protocolo ${safeText(this.protocol, this.fonts.regular)}`
        : 'Homologação sintética',
      {
        x: LEFT + 184,
        y: 33,
        size: 8,
        font: this.fonts.regular,
        color: MUTED,
      },
    );
    this.page.drawText(`Página ${this.pageNumber}`, {
      x: RIGHT - 54,
      y: 33,
      size: 8,
      font: this.fonts.regular,
      color: MUTED,
    });
  }

  private ensureSpace(height: number): void {
    if (this.y - height < BOTTOM) this.newPage();
  }

  reserve(height: number): void {
    this.ensureSpace(height);
  }

  space(height: number): void {
    this.ensureSpace(height);
    this.y -= height;
  }

  text(
    value: string,
    options: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gap?: number;
    } = {},
  ): void {
    const font = options.font ?? this.fonts.regular;
    const size = options.size ?? 11;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.42;
    const lines = wrapText(value, font, size, RIGHT - LEFT - indent);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      if (line) {
        this.page.drawText(line, {
          x: LEFT + indent,
          y: this.y - size,
          size,
          font,
          color: options.color ?? INK,
        });
      }
      this.y -= lineHeight;
    }
    this.y -= options.gap ?? 7;
  }

  heading(value: string, level: 'title' | 'section' = 'section'): void {
    const size = level === 'title' ? 23 : 13;
    const font = level === 'title' ? this.fonts.title : this.fonts.bold;
    this.ensureSpace(size * 2 + 12);
    this.text(value, { size, font, color: BURGUNDY, gap: level === 'title' ? 13 : 7 });
  }

  bullet(value: string): void {
    this.text(`• ${value}`, { indent: 5, gap: 3 });
  }

  label(value: string): void {
    this.text(value.toLocaleUpperCase('pt-BR'), {
      size: 8,
      font: this.fonts.bold,
      color: GOLD,
      gap: 4,
    });
  }

  get currentPage(): PDFPage {
    return this.page;
  }

  get currentY(): number {
    return this.y;
  }
}

async function drawProvidedImage(
  document: PDFDocument,
  page: PDFPage,
  bytes: Uint8Array | undefined,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): Promise<void> {
  if (!bytes || bytes.length < 4) return;
  try {
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    if (!isPng && !isJpeg) return;
    const image = isPng ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x, y, width, height });
  } catch {
    // Missing/invalid image bytes never trigger a renderer-side fetch or fail the PDF.
  }
}

async function drawSignature(writer: DiscPdfWriter, input: RespondentPdfInput): Promise<void> {
  const signer = input.signer;
  if (!signer?.full_name) return;
  writer.reserve(130);
  writer.heading('Assinatura responsável', 'section');
  writer.text(signer.full_name, { size: 10, font: writer.fonts.bold, gap: 2 });
  writer.text(`${signer.job_title?.trim() || 'Responsável técnica'} · CALI RH`, {
    size: 9,
    color: MUTED,
    gap: 2,
  });
  if (!input.signature)
    writer.text('Assinatura registrada para esta revisão.', {
      size: 8,
      font: writer.fonts.italic,
      color: MUTED,
      gap: 4,
    });
  if (input.avatar || input.signature) {
    writer.reserve(54);
    const page = writer.currentPage;
    const imageTop = writer.currentY;
    await drawProvidedImage(writer.document, page, input.avatar, LEFT, imageTop - 42, 42, 42);
    await drawProvidedImage(
      writer.document,
      page,
      input.signature,
      input.avatar ? LEFT + 54 : LEFT,
      imageTop - 33,
      122,
      33,
    );
    writer.space(54);
  }
}

function drawCover(writer: DiscPdfWriter, input: RespondentPdfInput, subtitle: string): void {
  writer.heading(input.title || 'Perfil Comportamental', 'title');
  writer.text(subtitle, { size: 12, color: MUTED, gap: 14 });
  if (input.organization)
    writer.text(input.organization, { size: 14, font: writer.fonts.bold, color: BURGUNDY });
}

function drawRespondent(writer: DiscPdfWriter, input: RespondentPdfInput): void {
  if (!input.primary) {
    writer.heading('Seu relatório ainda não está disponível', 'title');
    writer.text(
      'Não foi possível preparar a leitura individual. Fale com a CALI RH para receber orientação.',
    );
    return;
  }
  const primary = STYLE_CONTENT[input.primary];
  const secondary = input.secondary ? STYLE_CONTENT[input.secondary] : null;
  drawCover(writer, input, 'Seu Perfil Comportamental');
  if (input.personName)
    writer.text(input.personName, { size: 16, font: writer.fonts.bold, color: INK, gap: 4 });
  writer.label('Seu jeito de trabalhar');
  const combination = input.secondary ? combinationOf(input.primary, input.secondary) : null;
  writer.heading(
    profileName(input.primary, input.secondary ?? input.primary, Boolean(input.mixed)),
    'title',
  );
  if (combination) writer.text(combination.text, { size: 11, gap: 10 });
  writer.text(primary.respondent.summary, { size: 12, gap: 12 });
  if (secondary)
    writer.text(
      `O estilo ${secondary.name} também aparece na sua forma de agir. ${secondary.respondent.summary}`,
      {
        size: 10,
        color: MUTED,
      },
    );
  if (input.mixed)
    writer.text('Você pode reconhecer traços importantes dos dois estilos descritos.', {
      size: 10,
      font: writer.fonts.italic,
      color: MUTED,
    });
  writer.heading('O que você traz');
  primary.respondent.strengths.forEach((strength) =>
    writer.bullet(`${strength.title}: ${strength.example}`),
  );
  writer.text(primary.respondent.perceived, { size: 10, color: MUTED });
  writer.heading('Um ponto de atenção');
  writer.text(primary.respondent.cost);
  writer.heading('Como você decide, comunica e reage');
  writer.bullet(primary.respondent.decides);
  writer.bullet(primary.respondent.communicates);
  writer.bullet(primary.respondent.reacts);
  writer.heading('Experimente');
  primary.respondent.plan.forEach((step) => {
    writer.text(step.scenario, { size: 10, font: writer.fonts.bold, color: BURGUNDY, gap: 2 });
    writer.bullet(step.action);
    writer.text(step.question, { size: 9, font: writer.fonts.italic, color: MUTED, indent: 10 });
  });
  writer.text(`O que pode dar energia: ${primary.respondent.energy.join('; ')}.`, {
    size: 9,
    color: MUTED,
  });
  writer.text(`O que pode desgastar: ${primary.respondent.drains.join('; ')}.`, {
    size: 9,
    color: MUTED,
  });
  writer.text('Este relatório descreve preferências de trabalho; não define quem você é.', {
    size: 9,
    font: writer.fonts.italic,
    color: MUTED,
  });
}

export async function createRespondentPdf(input: RespondentPdfInput): Promise<Uint8Array> {
  const document = await PDFDocument.create({ updateMetadata: false });
  const createdAt = new Date(input.createdAt);
  if (!Number.isFinite(createdAt.getTime())) throw new Error('Data do resultado inválida.');
  document.setCreationDate(createdAt);
  document.setModificationDate(createdAt);
  document.setCreator('CALI RH');
  document.setProducer('CALI RH · PDF-lib 1.17.1');
  const [regular, bold, italic, title] = await Promise.all([
    document.embedFont(StandardFonts.Helvetica),
    document.embedFont(StandardFonts.HelveticaBold),
    document.embedFont(StandardFonts.TimesRomanItalic),
    document.embedFont(StandardFonts.TimesRomanBold),
  ]);
  const writer = new DiscPdfWriter(document, { regular, bold, italic, title }, input.protocol);
  drawRespondent(writer, input);
  await drawSignature(writer, input);
  return document.save();
}
