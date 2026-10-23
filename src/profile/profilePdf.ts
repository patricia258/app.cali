/* Gera um PDF A4 de verdade a partir das páginas .cpr-page já renderizadas (cada página vira uma imagem nítida). */
export async function pagesToPdf(container: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  if (document.fonts && !document.fonts.check('400 14px Inter') && !document.querySelector('link[data-cpr-font]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.dataset.cprFont = '1';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.append(link); await new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; setTimeout(resolve, 4000); });
  }
  // A fonte precisa estar carregada antes da captura: sem ela o navegador usa outra, mais larga, e o texto sai da margem.
  await Promise.all(['400', '600', '700'].map((weight) => document.fonts?.load(`${weight} 14px Inter`).catch(() => undefined)));
  await document.fonts?.ready;
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.cpr-page'));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  for (let index = 0; index < pages.length; index += 1) {
    const canvas = await html2canvas(pages[index], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    if (index > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }
  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export const fileSlug = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'perfil';
