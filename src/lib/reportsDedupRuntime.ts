function directTitle(section: Element) {
  return section.querySelector(':scope > span')?.textContent?.trim().toUpperCase() || '';
}

function reportSection(paper: Element, title: string) {
  return Array.from(paper.querySelectorAll<HTMLElement>('.reports-v9-paper-section'))
    .find((section) => directTitle(section) === title) || null;
}

function numberFromStart(value?: string | null) {
  const match = String(value || '').trim().match(/^-?\d+(?:[.,]\d+)?/);
  if (!match) return 0;
  const parsed = Number(match[0].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function flowMetric(flow: Element | null, phrase: string) {
  if (!flow) return 0;
  const item = Array.from(flow.querySelectorAll<HTMLElement>('.reports-v9-flow-legend > span'))
    .find((node) => node.textContent?.toLowerCase().includes(phrase));
  return numberFromStart(item?.textContent);
}

function makeExecutiveItem(label: string, text: string) {
  const item = document.createElement('div');
  const strong = document.createElement('strong');
  const paragraph = document.createElement('p');
  strong.textContent = label;
  paragraph.textContent = text;
  item.append(strong, paragraph);
  return item;
}

function improveExecutiveSummary(paper: HTMLElement) {
  const lead = reportSection(paper, 'SÍNTESE EXECUTIVA');
  if (!lead || lead.querySelector('.reports-v11-executive-grid')) return;

  const paragraph = lead.querySelector(':scope > p');
  const original = paragraph?.textContent?.trim() || '';
  const isAutomaticSummary = /^em\s.+\sregistrou\s/i.test(original)
    || /\d+h.*contratad/i.test(original)
    || /entregável\(eis\).*aprovado/i.test(original);
  if (!paragraph || !isAutomaticSummary) return;

  const flow = reportSection(paper, 'FLUXO DE EXECUÇÃO');
  const approved = flowMetric(flow, 'aprovado');
  const inProgress = flowMetric(flow, 'andamento');
  const validation = flowMetric(flow, 'validação');
  const attention = Boolean(reportSection(paper, 'PONTOS QUE PEDEM ATENÇÃO'));
  const hoursAlert = paper.querySelector<HTMLElement>('.reports-v9-hours-alert');
  const usageNeedsAttention = Boolean(hoursAlert?.classList.contains('watch') || hoursAlert?.classList.contains('critical'));

  const advance = approved > 0
    ? 'O período apresentou avanço nas frentes acompanhadas, com entregas concluídas e continuidade das iniciativas que permanecem em curso.'
    : inProgress > 0
      ? 'O período concentrou a atuação na evolução das frentes em andamento, ainda em processo de consolidação e fechamento.'
      : 'O período foi direcionado ao acompanhamento das prioridades pactuadas e à preparação dos próximos movimentos.';

  const attentionText = validation > 0 || attention
    ? 'Há dependências, validações ou definições que precisam ser concluídas para preservar o ritmo das frentes prioritárias.'
    : usageNeedsAttention
      ? 'A capacidade e o ritmo do período pedem acompanhamento para manter a atuação conectada às prioridades definidas.'
      : 'Não foram identificados bloqueios relevantes no fechamento; o foco permanece na continuidade disciplinada das frentes abertas.';

  const nextFocus = inProgress > 0 || validation > 0
    ? 'Concentrar o próximo ciclo na conclusão das frentes já iniciadas antes da abertura de novas demandas.'
    : 'Consolidar os resultados do período e direcionar o próximo ciclo às prioridades acordadas com o cliente.';

  const grid = document.createElement('div');
  grid.className = 'reports-v11-executive-grid';
  grid.append(
    makeExecutiveItem('Avanço do período', advance),
    makeExecutiveItem('Ponto de atenção', attentionText),
    makeExecutiveItem('Próximo foco', nextFocus),
  );
  paragraph.replaceWith(grid);
}

function moveMovementsToRegistry(paper: HTMLElement) {
  if (paper.querySelector('.reports-v11-registry')) return;
  const flow = reportSection(paper, 'FLUXO DE EXECUÇÃO');
  if (!flow) return;

  const sublists = Array.from(flow.querySelectorAll<HTMLElement>(':scope > .reports-v9-sublist'));
  if (sublists.length < 2) return;

  const movements = sublists[sublists.length - 1];
  const heading = movements.querySelector(':scope > strong')?.textContent?.trim().toLowerCase() || '';
  const looksLikeMovementList = /realizado|atuação|marco|entrega|movimento|treinamento|encontro|módulo/.test(heading);
  if (!looksLikeMovementList) return;

  const registry = document.createElement('section');
  registry.className = 'reports-v9-paper-section reports-v11-registry';
  const title = document.createElement('span');
  title.textContent = 'REGISTRO DO PERÍODO';
  const cloned = movements.cloneNode(true) as HTMLElement;
  const clonedHeading = cloned.querySelector(':scope > strong');
  if (clonedHeading) clonedHeading.textContent = 'Marcos e acontecimentos registrados';
  registry.append(title, cloned);
  flow.insertAdjacentElement('afterend', registry);
  movements.remove();
}

function feedbackMetric(section: Element, label: string) {
  const block = Array.from(section.querySelectorAll<HTMLElement>('.reports-v9-feedback-line > div'))
    .find((node) => node.querySelector('small')?.textContent?.trim().toUpperCase() === label);
  return block ? numberFromStart(block.querySelector('strong')?.textContent) : null;
}

function starVisual(average: number) {
  const stars = document.createElement('span');
  stars.className = 'reports-v11-stars';
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', `${average.toFixed(1).replace('.', ',')} de 5 estrelas`);

  const back = document.createElement('span');
  back.className = 'back';
  back.textContent = '★★★★★';
  const front = document.createElement('span');
  front.className = 'front';
  front.textContent = '★★★★★';
  front.style.width = `${Math.max(0, Math.min(100, (average / 5) * 100))}%`;
  stars.append(back, front);
  return stars;
}

function improveFeedback(paper: HTMLElement) {
  const section = reportSection(paper, 'FEEDBACK DO PERÍODO');
  if (!section || section.querySelector('.reports-v11-feedback-summary')) return;
  const line = section.querySelector<HTMLElement>('.reports-v9-feedback-line');
  if (!line) return;

  const responses = feedbackMetric(section, 'RESPOSTAS') ?? 0;
  const average = feedbackMetric(section, 'MÉDIA');
  const low = feedbackMetric(section, 'NOTAS ATÉ 3') ?? 0;
  const summary = document.createElement('div');
  summary.className = 'reports-v11-feedback-summary';

  if (responses <= 0) {
    const empty = document.createElement('p');
    empty.className = 'reports-v11-feedback-empty';
    empty.textContent = 'Sem avaliações recebidas neste período.';
    summary.append(empty);
  } else {
    const score = document.createElement('div');
    score.className = 'reports-v11-feedback-score';
    if (average !== null) score.append(starVisual(average));

    const copy = document.createElement('div');
    const strong = document.createElement('strong');
    const small = document.createElement('small');
    strong.textContent = average === null ? 'Avaliações recebidas' : `${average.toFixed(1).replace('.', ',')} / 5`;
    small.textContent = `${responses} resposta${responses === 1 ? '' : 's'} recebida${responses === 1 ? '' : 's'}`;
    copy.append(strong, small);
    score.append(copy);
    summary.append(score);

    if (low > 0) {
      const note = document.createElement('small');
      note.className = 'reports-v11-feedback-note';
      note.textContent = `${low} avaliação${low === 1 ? '' : 'ões'} com nota até 3 pede${low === 1 ? '' : 'm'} leitura qualitativa.`;
      summary.append(note);
    }
  }

  line.replaceWith(summary);
}

function processPaper(paper: HTMLElement) {
  improveExecutiveSummary(paper);
  moveMovementsToRegistry(paper);
  improveFeedback(paper);
}

function scanReports() {
  document.querySelectorAll<HTMLElement>('.reports-v9-paper').forEach(processPaper);
}

export function installReportsDedupRuntime() {
  if (typeof document === 'undefined') return;
  const start = () => {
    scanReports();
    const observer = new MutationObserver(() => queueMicrotask(scanReports));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
