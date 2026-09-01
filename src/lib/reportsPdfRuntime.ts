import { resolveWorkspaceMedia } from './workspaceMedia';

let installed = false;
let previousTitle = '';
const retriedImages = new WeakSet<HTMLImageElement>();

function reportPaper() {
  return document.querySelector<HTMLElement>('.reports-v9-preview-modal .reports-v9-paper')
    || document.querySelector<HTMLElement>('.reports-v9-paper');
}

function reportFileTitle() {
  const paper = reportPaper();
  if (!paper) return '';

  const company = paper.querySelector<HTMLElement>('.reports-v9-title > span')?.textContent?.trim() || 'Cliente';
  const reportType = paper.querySelector<HTMLElement>('.reports-v9-title h1')?.textContent?.trim() || 'Relatório CALI RH';
  const period = paper.querySelector<HTMLElement>('.reports-v9-title > p')?.textContent?.trim() || '';
  return `${reportType} CALI RH - ${company}${period ? ` - ${period}` : ''}`;
}

async function refreshReportLogo(image: HTMLImageElement) {
  if (retriedImages.has(image)) return;
  retriedImages.add(image);

  const current = image.currentSrc || image.src;
  if (!current) return;

  const refreshed = await resolveWorkspaceMedia(current, 3600, true);
  if (refreshed && refreshed !== current) {
    image.src = refreshed;
    return;
  }

  image.classList.add('reports-v10-broken-client-logo');
}

function bindReportLogos(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>('.reports-v9-paper-header > img').forEach((image) => {
    if (image.dataset.reportMediaBound === 'true') return;
    image.dataset.reportMediaBound = 'true';
    image.addEventListener('error', () => void refreshReportLogo(image));
    if (image.complete && image.naturalWidth === 0) void refreshReportLogo(image);
  });
}

function annotateReviewState(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.report-status-v3.review').forEach((item) => {
    item.title = 'Salvo para validação interna. Ainda não foi publicado nem enviado ao cliente.';
    item.setAttribute('aria-label', 'Em revisão: salvo para validação interna; não publicado e não enviado ao cliente.');
  });

  root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    if (button.textContent?.trim() !== 'Em revisão') return;
    button.title = 'Salvar o relatório para sua validação final. Isso não envia nada ao cliente.';
    button.setAttribute('aria-label', 'Salvar em revisão - validação interna antes da publicação');
  });
}

function refreshEnhancements(root: ParentNode = document) {
  bindReportLogos(root);
  annotateReviewState(root);
}

export function installReportsPdfRuntime() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  refreshEnhancements();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) refreshEnhancements(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('beforeprint', () => {
    previousTitle = document.title;
    const next = reportFileTitle();
    if (next) document.title = next;
    document.documentElement.classList.add('reports-printing-v10');
  });

  window.addEventListener('afterprint', () => {
    document.documentElement.classList.remove('reports-printing-v10');
    if (previousTitle) document.title = previousTitle;
    previousTitle = '';
  });
}
