import { supabase } from './supabase';

const ROOT = '.reports-admin-v14';
const OFFICIAL_LOGO = 'https://mapa.calirh.com/logo.svg';

function text(node: Element | null) {
  return String(node?.textContent || '').trim();
}

function lifecycle(root: Element) {
  const status = root.querySelector('.reports-v14-status');
  if (!status) return 'draft';
  if (status.classList.contains('review')) return 'review';
  if (status.classList.contains('approved')) return 'approved';
  if (status.classList.contains('sent') || status.classList.contains('published')) return 'sent';
  return 'draft';
}

function setPreviewPage(preview: Element, page: 1 | 2) {
  preview.classList.toggle('reports-v14-preview-page-two', page === 2);
  preview.classList.toggle('reports-v14-preview-page-one', page === 1);
  preview.querySelectorAll<HTMLElement>('[data-report-page]').forEach((button) => {
    const active = Number(button.dataset.reportPage) === page;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function enhanceFlow(root: Element) {
  const command = root.querySelector('.reports-v14-commandbar');
  if (!command || root.querySelector('.reports-v14-flow-guide')) return;
  const current = lifecycle(root);
  const order = current === 'draft' ? 1 : current === 'review' ? 2 : current === 'approved' ? 3 : 4;
  const guide = document.createElement('section');
  guide.className = 'reports-v14-flow-guide';
  guide.innerHTML = `
    <div class="reports-v14-flow-copy">
      <strong>Como este fechamento funciona</strong>
      <span>Os fatos já vêm da plataforma. Você só revisa a leitura, aprova e então envia.</span>
    </div>
    <div class="reports-v14-flow-steps">
      <span class="${order >= 1 ? 'done' : ''} ${order === 1 ? 'current' : ''}"><b>1</b> Conferir fatos</span>
      <i></i>
      <span class="${order >= 2 ? 'done' : ''} ${order === 2 ? 'current' : ''}"><b>2</b> Revisar leitura</span>
      <i></i>
      <span class="${order >= 3 ? 'done' : ''} ${order === 3 ? 'current' : ''}"><b>3</b> Aprovar</span>
      <i></i>
      <span class="${order >= 4 ? 'done' : ''} ${order === 4 ? 'current' : ''}"><b>4</b> Enviar ao cliente</span>
    </div>`;
  command.insertAdjacentElement('afterend', guide);
}

function enhanceNarrative(root: Element) {
  const fields = Array.from(root.querySelectorAll('.reports-v14-narrative-field'));
  fields.forEach((field, index) => {
    const page: 1 | 2 = index === 0 ? 1 : 2;
    if (!field.querySelector('.reports-v14-pdf-location')) {
      const chip = document.createElement('span');
      chip.className = 'reports-v14-pdf-location';
      chip.textContent = `PDF · página ${page}`;
      field.querySelector('header')?.appendChild(chip);
    }
    const textarea = field.querySelector('textarea');
    if (textarea && !textarea.dataset.previewLinked) {
      textarea.dataset.previewLinked = 'true';
      const switchPage = () => {
        const preview = root.querySelector('.reports-v14-preview');
        if (preview) setPreviewPage(preview, page);
      };
      textarea.addEventListener('focus', switchPage);
      textarea.addEventListener('click', switchPage);
    }
  });

  const decisions = root.querySelector('.reports-v14-decisions>header');
  if (decisions && !decisions.querySelector('.reports-v14-pdf-location')) {
    const chip = document.createElement('span');
    chip.className = 'reports-v14-pdf-location';
    chip.textContent = 'PDF · página 2';
    decisions.appendChild(chip);
  }
}

function enhancePreview(root: Element) {
  const preview = root.querySelector('.reports-v14-preview');
  if (!preview) return;
  if (!preview.classList.contains('reports-v14-preview-page-one') && !preview.classList.contains('reports-v14-preview-page-two')) {
    preview.classList.add('reports-v14-preview-page-one');
  }
  const scroll = preview.querySelector('.reports-v14-preview-scroll');
  if (scroll && !preview.querySelector('.reports-v14-page-switch')) {
    const switcher = document.createElement('nav');
    switcher.className = 'reports-v14-page-switch';
    switcher.setAttribute('aria-label', 'Página exibida na prévia');
    switcher.innerHTML = `
      <button type="button" data-report-page="1" class="active" aria-pressed="true"><b>1</b><span>Página 1<small>Fatos e execução</small></span></button>
      <button type="button" data-report-page="2" aria-pressed="false"><b>2</b><span>Página 2<small>Sua leitura e próximos movimentos</small></span></button>`;
    switcher.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.addEventListener('click', () => setPreviewPage(preview, Number(button.dataset.reportPage) === 2 ? 2 : 1));
    });
    preview.insertBefore(switcher, scroll);
  }
}

function enhanceInternalNote(root: Element) {
  const note = root.querySelector('.reports-v14-internal-note');
  if (!note || note.classList.contains('reports-v14-internal-enhanced')) return;
  note.classList.add('reports-v14-internal-enhanced', 'collapsed');
  const strong = note.querySelector('strong');
  const small = note.querySelector('small');
  if (strong) strong.textContent = 'Nota só para mim (opcional)';
  if (small) small.textContent = 'Não entra no PDF, não aparece no Workspace do cliente e não vai no e-mail.';
  const label = document.createElement('span');
  label.className = 'reports-v14-not-in-pdf';
  label.textContent = 'NÃO ENTRA NO PDF';
  note.querySelector('div')?.appendChild(label);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'reports-v14-internal-toggle';
  toggle.textContent = 'Adicionar nota interna';
  toggle.addEventListener('click', () => {
    const collapsed = note.classList.toggle('collapsed');
    toggle.textContent = collapsed ? 'Adicionar nota interna' : 'Ocultar nota interna';
  });
  note.insertBefore(toggle, note.querySelector('textarea'));
}

async function deleteHistoryReport(card: HTMLElement) {
  if (!supabase) return;
  const protocol = text(card.querySelector('small'));
  if (!protocol || protocol === '—') return;
  const statusText = text(card.querySelector('em')).toLowerCase();
  if (!statusText.includes('rascunho') && !statusText.includes('revis')) {
    window.alert('Relatórios aprovados ou enviados ficam protegidos no histórico. Só rascunhos e versões em revisão podem ser excluídos.');
    return;
  }
  const lookup = await supabase.from('reports').select('id,status,period_start,version').eq('protocol', protocol).maybeSingle();
  if (lookup.error || !lookup.data) {
    window.alert(lookup.error?.message || 'Não foi possível localizar esta versão.');
    return;
  }
  if (!['draft', 'review'].includes(String(lookup.data.status))) {
    window.alert('Esta versão já foi aprovada/enviada e não pode ser excluída.');
    return;
  }
  const ok = window.confirm(`Excluir definitivamente ${protocol}?\n\nEsta ação remove apenas este rascunho/versão em revisão. Relatórios aprovados ou enviados continuam protegidos.`);
  if (!ok) return;
  const result = await supabase.from('reports').delete().eq('id', lookup.data.id).in('status', ['draft', 'review']);
  if (result.error) {
    window.alert(result.error.message);
    return;
  }
  window.location.reload();
}

function enhanceHistory(root: Element) {
  const history = root.querySelector('.reports-v14-history');
  if (!history) return;
  const helper = history.querySelector('header small');
  if (helper) helper.textContent = 'Rascunhos e versões em revisão podem ser excluídos. Aprovados e enviados ficam protegidos.';
  history.querySelectorAll<HTMLElement>(':scope>div>button').forEach((card) => {
    if (card.querySelector('.reports-v14-history-delete')) return;
    const statusText = text(card.querySelector('em')).toLowerCase();
    const canDelete = statusText.includes('rascunho') || statusText.includes('revis');
    if (!canDelete) return;
    const control = document.createElement('span');
    control.className = 'reports-v14-history-delete';
    control.setAttribute('role', 'button');
    control.setAttribute('tabindex', '0');
    control.setAttribute('aria-label', 'Excluir esta versão');
    control.setAttribute('title', 'Excluir rascunho/versão em revisão');
    control.innerHTML = '×';
    const run = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      void deleteHistoryReport(card);
    };
    control.addEventListener('click', run);
    control.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') run(event);
    });
    card.appendChild(control);
  });
}

function enhanceActions(root: Element) {
  root.querySelectorAll<HTMLButtonElement>('.reports-v14-actions button').forEach((button) => {
    if (text(button).includes('Recalcular dados')) {
      button.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && String(node.textContent).includes('Recalcular dados')) node.textContent = ' Atualizar fatos';
      });
      button.title = 'Busca novamente horas, entregas, prazos e registros da plataforma sem apagar o que você escreveu.';
    }
  });
  const primary = Array.from(root.querySelectorAll<HTMLButtonElement>('.reports-v14-actions button')).find((button) => text(button).includes('Enviar ao cliente'));
  const actions = root.querySelector('.reports-v14-actions');
  if (primary && actions && !root.querySelector('.reports-v14-send-explainer')) {
    const info = document.createElement('span');
    info.className = 'reports-v14-send-explainer';
    info.textContent = 'Ao enviar: libera no Workspace do cliente + dispara o e-mail.';
    actions.insertAdjacentElement('afterend', info);
  }
}

function enhanceOfficialLogo(root: Element) {
  root.querySelectorAll<HTMLElement>('.reports-v14-paper-brand').forEach((brand) => {
    if (brand.dataset.officialLogo === 'true') return;
    brand.dataset.officialLogo = 'true';
    brand.innerHTML = `<img class="reports-v14-official-logo" src="${OFFICIAL_LOGO}" alt="CALI RH" />`;
  });
}

function enhance() {
  if (!location.pathname.startsWith('/admin/relatorios') && !location.pathname.startsWith('/cliente/relatorios')) return;
  document.querySelectorAll(ROOT).forEach((root) => {
    enhanceFlow(root);
    enhanceNarrative(root);
    enhancePreview(root);
    enhanceInternalNote(root);
    enhanceHistory(root);
    enhanceActions(root);
    enhanceOfficialLogo(root);
  });
  document.querySelectorAll('.client-reports-v14, .reports-v14-preview-modal').forEach((root) => enhanceOfficialLogo(root));
}

let observer: MutationObserver | null = null;

export function installReportsV14ClarityRuntime() {
  if (observer) return;
  const run = () => window.requestAnimationFrame(enhance);
  observer = new MutationObserver(run);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('popstate', run);
  window.addEventListener('hashchange', run);
  document.addEventListener('focusin', run);
  run();
}
