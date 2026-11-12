import { showMessage } from '../../components/feedback/workspaceDialogs';
import { recordsAvailable } from '../../api/records/client';
import {
  decideRecordReopen, readRecordClosureContext, requestRecordReopen, submitRecordFeedback,
  type RecordClosureContext as Context, type RecordClosureView as RecordContext, type RecordFeedback as Feedback,
} from '../../api/records/closure';
import '../../modules/records/records-closure-dialogs.css';
import '../../modules/records/records-closure-summary.css';

type Role = 'admin' | 'client';
let installed = false;
let busy = false;
let dismissedAdminRequest = '';
let lastProtocol = '';

function currentRole(): Role | null {
  if (location.pathname.startsWith('/admin/registros')) return 'admin';
  if (location.pathname.startsWith('/cliente/registros')) return 'client';
  return null;
}
function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}
function drawer() { return document.querySelector<HTMLElement>(":is(.records-v13-drawer,[data-v2-operation~=\"records-v13-drawer\"])"); }
function protocolFromDrawer(target: HTMLElement) { return target.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || ''; }
function statusLabel(status?: string | null) {
  if (status === 'completed') return 'Finalizada';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'standby') return 'Stand by';
  if (status === 'waiting_client') return 'Aguardando cliente';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'open') return 'Aberta';
  return '—';
}
function emojiForScore(score: number) {
  if (score <= 2) return '😞';
  if (score === 3) return '😐';
  if (score === 4) return '😊';
  return '🤩';
}
function messageForScore(score: number) {
  if (score <= 2) return { title: 'Poxa, que pena.', copy: 'Lamento muito por essa nota. Pode me contar o que podemos melhorar?' };
  if (score === 3) return { title: 'Obrigada por me contar.', copy: 'Estou sempre buscando melhorar. O que poderia ter sido melhor?' };
  if (score === 4) return { title: 'Fico muito feliz por essa nota.', copy: 'Se quiser me contar mais alguma coisa, o campo abaixo é opcional.' };
  return { title: 'Uau! Muito obrigada por essa avaliação.', copy: 'Fico muito feliz. Estou sempre buscando melhorar — se quiser deixar um comentário, vou adorar ler.' };
}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}
function actionButton(label: string, className = 'primary') {
  const item = node('button', className, label);
  item.type = 'button';
  return item;
}
function remove(selector: string, target: ParentNode = document) { target.querySelectorAll(selector).forEach((item) => item.remove()); }
function overlay(target: HTMLElement, className: string) {
  const item = node('div', className);
  target.append(item);
  return item;
}
function addTextBlock(parent: HTMLElement, kicker: string, title: string, copy: string) {
  parent.append(node('span', 'records-v28-kicker', kicker), node('h3', '', title), node('p', '', copy));
}
function renderThanks(card: HTMLElement, title: string, copy: string, buttonLabel: string, onBack: () => void) {
  card.replaceChildren();
  const wrap = node('div', 'records-v28-thanks');
  wrap.append(node('span', 'records-v28-thanks-icon', '✓'), node('span', 'records-v28-kicker', 'REGISTRADO'), node('h3', '', title), node('p', '', copy));
  const back = actionButton(buttonLabel);
  back.onclick = onBack;
  wrap.append(back);
  card.append(wrap);
}

function renderClientFeedback(target: HTMLElement, ctx: Context) {
  const existing = target.querySelector<HTMLElement>('.records-v29-feedback-overlay');
  const trigger = target.querySelector<HTMLButtonElement>('.records-v29-feedback-trigger');
  const closure = ctx.closure;
  if (existing && closure && target.dataset.v29FeedbackDone === closure.id) return;
  if (ctx.record.workflow_status !== 'completed' || !closure || closure.answered_at || closure.closed_unanswered_at) {
    existing?.remove();
    trigger?.remove();
    return;
  }
  if (target.dataset.v29FeedbackDismissed === closure.id) {
    if (!trigger) {
      const show = actionButton('Avaliar atendimento', 'secondary records-v29-feedback-trigger');
      show.onclick = () => {
        delete target.dataset.v29FeedbackDismissed;
        show.remove();
        renderClientFeedback(target, ctx);
      };
      target.querySelector('.records-v27-chat-locked')?.append(show);
    }
    return;
  }
  trigger?.remove();
  if (existing?.dataset.closureId === closure.id) return;
  existing?.remove();

  const layer = overlay(target, 'records-v28-feedback-overlay records-v29-feedback-overlay');
  layer.dataset.closureId = closure.id;
  const card = node('section', 'records-v28-feedback-card');
  addTextBlock(card, 'AVALIAÇÃO DO ATENDIMENTO', 'Como foi este atendimento?', 'Escolha uma nota de 1 a 5. Você pode revisar antes de enviar.');
  const scores = node('div', 'records-v28-score-grid');
  const response = node('div', 'records-v28-score-response');
  response.hidden = true;
  const textareaLabel = node('label');
  const labelText = node('span', '', 'Comentário');
  const textarea = node('textarea');
  textarea.rows = 4;
  textarea.maxLength = 2000;
  textarea.placeholder = 'Conte em poucas palavras.';
  textareaLabel.append(labelText, textarea);
  const actions = node('div', 'records-v28-actions');
  const submit = actionButton('Enviar avaliação');
  submit.disabled = true;
  actions.append(submit);
  let selected = 0;

  for (const score of [1, 2, 3, 4, 5]) {
    const scoreButton = actionButton(String(score), 'records-v28-score-button');
    scoreButton.onclick = () => {
      selected = score;
      scores.querySelectorAll('button').forEach((item) => item.classList.toggle('selected', item === scoreButton));
      const copy = messageForScore(score);
      response.replaceChildren();
      response.hidden = false;
      const message = node('div', 'records-v28-score-message');
      const messageCopy = node('div');
      messageCopy.append(node('strong', '', copy.title), node('p', '', copy.copy));
      message.append(node('span', '', emojiForScore(score)), messageCopy);
      labelText.textContent = score <= 3 ? 'O que podemos melhorar?' : 'Quer contar mais alguma coisa?';
      textarea.placeholder = score <= 3 ? 'Sua justificativa é importante para entendermos o que pode melhorar.' : 'Opcional — escreva se quiser deixar um comentário.';
      response.append(message, textareaLabel, actions);
      submit.disabled = score <= 3 ? textarea.value.trim().length < 3 : false;
      if (score <= 3) window.setTimeout(() => textarea.focus(), 20);
    };
    scores.append(scoreButton);
  }
  textarea.oninput = () => { submit.disabled = !selected || (selected <= 3 && textarea.value.trim().length < 3); };
  submit.onclick = async () => {
    if (!recordsAvailable || !selected || (selected <= 3 && textarea.value.trim().length < 3)) return;
    submit.disabled = true;
    submit.textContent = 'Registrando…';
    const result = await submitRecordFeedback(ctx.record.id, closure.id, selected, textarea.value.trim() || null);
    if (result.error) {
      submit.disabled = false;
      submit.textContent = 'Enviar avaliação';
      void showMessage(result.error.message || 'Não foi possível registrar sua avaliação.');
      return;
    }
    target.dataset.v29FeedbackDone = closure.id;
    renderThanks(card, 'Avaliação registrada', 'A avaliação fica vinculada a este encerramento. O histórico continua disponível para consulta.', 'Voltar ao histórico', () => {
      layer.remove();
      delete target.dataset.v29FeedbackDone;
      void enhance();
    });
  };
  const later = actionButton('Avaliar depois', 'secondary');
  later.onclick = () => {
    target.dataset.v29FeedbackDismissed = closure.id;
    layer.remove();
    renderClientFeedback(target, ctx);
  };
  card.append(scores, response, later);
  layer.append(card);
}

function showClientReopenDialog(target: HTMLElement, ctx: Context) {
  remove('.records-v29-reopen-overlay', target);
  const layer = overlay(target, 'records-v28-reopen-overlay records-v29-reopen-overlay');
  const card = node('section', 'records-v28-reopen-card');
  addTextBlock(card, 'SOLICITAR REABERTURA', 'Por que você precisa reabrir esta solicitação?', 'Explique brevemente o motivo. A CALI vai analisar antes de liberar novas mensagens.');
  const hours = node('div', 'records-v28-hour-note');
  hours.append(node('strong', '', 'Importante'), node('span', '', 'O tempo já consumido continua contabilizado e não retorna ao saldo de horas.'));
  const label = node('label');
  label.append(node('span', '', 'Justificativa da reabertura'));
  const reason = node('textarea');
  reason.rows = 5;
  reason.placeholder = 'Ex.: surgiu uma nova informação e preciso retomar este assunto porque…';
  label.append(reason);
  const actions = node('div', 'records-v28-actions split');
  const cancel = actionButton('Cancelar', 'secondary');
  const send = actionButton('Enviar para análise');
  send.disabled = true;
  cancel.onclick = () => layer.remove();
  reason.oninput = () => { send.disabled = reason.value.trim().length < 3; };
  send.onclick = async () => {
    if (!recordsAvailable || reason.value.trim().length < 3) return;
    send.disabled = true;
    send.textContent = 'Enviando…';
    const result = await requestRecordReopen(ctx.record.id, reason.value.trim());
    if (result.error) {
      send.disabled = false;
      send.textContent = 'Enviar para análise';
      void showMessage(result.error.message || 'Não foi possível solicitar a reabertura.');
      return;
    }
    renderThanks(card, 'Reabertura solicitada.', 'A CALI recebeu sua justificativa e vai analisar o pedido. Você será notificado quando houver uma decisão.', 'Voltar ao histórico', () => location.reload());
  };
  actions.append(cancel, send);
  card.append(hours, label, actions);
  layer.append(card);
  window.setTimeout(() => reason.focus(), 30);
}

function renderClientReopen(target: HTMLElement, ctx: Context) {
  const locked = target.querySelector<HTMLElement>('.records-v27-chat-locked');
  if (!locked) return;
  let trigger = locked.querySelector<HTMLButtonElement>('.records-v29-reopen-trigger');
  if (!trigger) {
    trigger = actionButton('Solicitar reabertura', 'secondary records-v28-reopen-trigger records-v29-reopen-trigger');
    locked.append(trigger);
  }
  if (ctx.reopen) {
    trigger.disabled = true;
    trigger.textContent = 'Reabertura solicitada';
    trigger.onclick = null;
  } else {
    trigger.disabled = false;
    trigger.textContent = 'Solicitar reabertura';
    trigger.onclick = () => showClientReopenDialog(target, ctx);
  }
}

function renderAdminFeedback(target: HTMLElement, ctx: Context) {
  const existing = target.querySelector<HTMLElement>('.records-v29-admin-feedback');
  if (!ctx.feedback) { existing?.remove(); return; }
  const signature = `${ctx.record.id}|${ctx.feedback.score}|${ctx.feedback.comment || ''}|${ctx.feedback.created_at}`;
  if (existing?.dataset.signature === signature) return;
  existing?.remove();
  const card = node('section', `records-v28-admin-feedback records-v29-admin-feedback score-${ctx.feedback.score}`);
  card.dataset.signature = signature;
  const score = node('div', 'records-v28-admin-score');
  const number = node('strong', '', String(ctx.feedback.score));
  number.append(node('small', '', '/5'));
  score.append(node('span', '', emojiForScore(ctx.feedback.score)), number);
  const copy = node('div');
  copy.append(node('span', 'records-v28-kicker', 'AVALIAÇÃO DO CLIENTE'), node('strong', '', messageForScore(ctx.feedback.score).title), node('p', '', ctx.feedback.comment || 'O cliente não deixou comentário adicional.'), node('small', '', `Registrada ${formatDate(ctx.feedback.created_at)}`));
  card.append(score, copy);
  const host = target.querySelector<HTMLElement>('.records-v25-ops');
  if (host) host.append(card);
  else target.querySelector(":is(.records-v13-conversation,[data-v2-operation~=\"records-v13-conversation\"])")?.before(card);
}

function summaryCell(label: string, value: string) {
  const cell = node('div');
  cell.append(node('span', '', label), node('strong', '', value));
  return cell;
}
function showAdminReopenOverlay(target: HTMLElement, ctx: Context) {
  if (!ctx.reopen) return;
  dismissedAdminRequest = '';
  const old = target.querySelector<HTMLElement>('.records-v29-admin-reopen-overlay');
  if (old?.dataset.requestId === ctx.reopen.id) return;
  old?.remove();
  const layer = overlay(target, 'records-v28-admin-reopen-overlay records-v29-admin-reopen-overlay');
  layer.dataset.requestId = ctx.reopen.id;
  const card = node('section', 'records-v28-admin-reopen-card');
  addTextBlock(card, 'PEDIDO DE REABERTURA', 'O cliente quer retomar esta solicitação.', 'Analise o motivo e escolha se o atendimento deve ser reaberto.');
  const company = target.querySelector<HTMLElement>('header p')?.textContent?.split(' · ')[0]?.trim() || 'Cliente';
  const reason = ctx.reopen.reason?.trim() || 'Motivo não informado — este pedido foi criado antes da nova regra de justificativa obrigatória.';
  const summary = node('div', 'records-v28-reopen-summary');
  summary.append(summaryCell('Cliente', company), summaryCell('Protocolo', ctx.record.protocol || '—'), summaryCell('Status atual', statusLabel(ctx.record.workflow_status)), summaryCell('Solicitado', formatDate(ctx.reopen.requested_at)));
  const reasonBox = node('div', 'records-v28-reason-box');
  reasonBox.append(node('span', '', 'JUSTIFICATIVA DO CLIENTE'), node('p', '', reason));
  card.append(summary, reasonBox);
  if (ctx.feedback) {
    const feedback = node('div', 'records-v28-feedback-inline');
    const feedbackCopy = node('div');
    feedbackCopy.append(node('small', '', 'AVALIAÇÃO DESTA SOLICITAÇÃO'), node('strong', '', `${ctx.feedback.score}/5`), node('p', '', ctx.feedback.comment || 'Sem comentário adicional.'));
    feedback.append(node('span', '', emojiForScore(ctx.feedback.score)), feedbackCopy);
    card.append(feedback);
  }
  const label = node('label');
  label.append(node('span', '', 'Mensagem ao cliente'));
  const note = node('textarea');
  note.rows = 4;
  note.placeholder = 'Opcional ao reabrir. Obrigatória se você recusar o pedido.';
  label.append(note);
  const error = node('small', 'records-v28-inline-error');
  error.hidden = true;
  const actions = node('div', 'records-v28-actions admin');
  const history = actionButton('Ver histórico antes de decidir', 'secondary records-v28-history-button');
  const reject = actionButton('Recusar', 'secondary records-v28-reject-button');
  const approve = actionButton('Reabrir atendimento');
  history.onclick = () => {
    dismissedAdminRequest = ctx.reopen!.id;
    layer.remove();
    renderAdminPendingBanner(target, ctx);
  };
  const decide = async (decision: 'approved' | 'rejected') => {
    if (!recordsAvailable || !ctx.reopen) return;
    if (decision === 'rejected' && note.value.trim().length < 3) {
      error.hidden = false;
      error.textContent = 'Explique ao cliente por que a reabertura não foi aprovada.';
      note.focus();
      return;
    }
    error.hidden = true;
    approve.disabled = true;
    reject.disabled = true;
    history.disabled = true;
    const result = await decideRecordReopen(ctx.reopen.id, decision, note.value.trim() || null);
    if (result.error) {
      approve.disabled = false;
      reject.disabled = false;
      history.disabled = false;
      error.hidden = false;
      error.textContent = result.error.message || 'Não foi possível registrar a decisão.';
      return;
    }
    layer.dataset.decisionDone = '1';
    renderThanks(card, decision === 'approved' ? 'Atendimento reaberto.' : 'Pedido de reabertura recusado.', 'O cliente será notificado e receberá sua mensagem.', 'Fechar', () => location.reload());
    window.setTimeout(() => location.reload(), 1200);
  };
  reject.onclick = () => void decide('rejected');
  approve.onclick = () => void decide('approved');
  actions.append(history, reject, approve);
  card.append(label, error, actions);
  layer.append(card);
}
function renderAdminPendingBanner(target: HTMLElement, ctx: Context) {
  if (!ctx.reopen) return;
  let banner = target.querySelector<HTMLElement>('.records-v29-reopen-banner');
  if (banner?.dataset.requestId === ctx.reopen.id) return;
  banner?.remove();
  banner = node('div', 'records-v28-reopen-banner records-v29-reopen-banner');
  banner.dataset.requestId = ctx.reopen.id;
  const copy = node('div');
  copy.append(node('span', '', 'PEDIDO DE REABERTURA PENDENTE'), node('strong', '', 'Decisão aguardando sua análise.'));
  const review = actionButton('Rever pedido', 'secondary');
  review.onclick = () => showAdminReopenOverlay(target, ctx);
  banner.append(copy, review);
  const host = target.querySelector<HTMLElement>('.records-v25-ops');
  if (host) host.prepend(banner);
  else target.querySelector(":is(.records-v13-conversation,[data-v2-operation~=\"records-v13-conversation\"])")?.before(banner);
}
function renderAdminReopen(target: HTMLElement, ctx: Context) {
  if (!ctx.reopen) {
    remove('.records-v29-admin-reopen-overlay', target);
    remove('.records-v29-reopen-banner', target);
    return;
  }
  target.querySelector<HTMLElement>('.records-v13-drawer-actions')?.querySelectorAll<HTMLButtonElement>('button').forEach((item) => {
    if (/aprovar reabertura|^reabrir$/i.test(item.textContent?.trim() || '')) item.style.display = 'none';
  });
  const currentOverlay = target.querySelector<HTMLElement>('.records-v29-admin-reopen-overlay');
  if (currentOverlay?.dataset.decisionDone === '1') return;
  if (dismissedAdminRequest === ctx.reopen.id) renderAdminPendingBanner(target, ctx);
  else showAdminReopenOverlay(target, ctx);
}

function polishAdminReopen(target: HTMLElement, ctx: { record: RecordContext }) {
  const card = target.querySelector<HTMLElement>('.records-v29-admin-reopen-overlay .records-v28-admin-reopen-card');
  if (!card) return;

  card.classList.add('records-v30-admin-reopen-card');
  const summary = card.querySelector<HTMLElement>('.records-v28-reopen-summary');
  if (summary && summary.dataset.v30 !== '1') {
    summary.dataset.v30 = '1';
    summary.replaceChildren();

    const status = document.createElement('div');
    status.className = 'records-v30-summary-status';
    const statusLabelEl = document.createElement('span');
    statusLabelEl.textContent = 'STATUS ATUAL';
    const statusValue = document.createElement('strong');
    statusValue.textContent = statusLabel(ctx.record.workflow_status);
    status.append(statusLabelEl, statusValue);

    const period = document.createElement('div');
    period.className = 'records-v30-summary-period';
    const periodLabel = document.createElement('span');
    periodLabel.textContent = 'PERÍODO';
    const dates = document.createElement('div');
    dates.className = 'records-v30-period-dates';
    const opened = document.createElement('p');
    opened.append(node('small', '', 'Abertura'), node('strong', '', formatDate(ctx.record.created_at)));
    const closed = document.createElement('p');
    closed.append(node('small', '', 'Finalização'), node('strong', '', formatDate(ctx.record.closed_at)));
    dates.append(opened, closed);
    period.append(periodLabel, dates);

    summary.append(status, period);
  }

  const actions = card.querySelector<HTMLElement>('.records-v28-actions.admin');
  if (actions) actions.classList.add('records-v30-admin-actions');
}

function renderClientFeedbackHistory(target: HTMLElement, feedback: Feedback | null) {
  const existing = target.querySelector<HTMLElement>('.records-v30-client-feedback-history');
  if (!feedback) {
    existing?.remove();
    return;
  }

  const signature = `${feedback.score}|${feedback.comment || ''}|${feedback.created_at}`;
  if (existing?.dataset.signature === signature) return;
  existing?.remove();

  // Cartão fixo (sem abrir/fechar), com a nota em destaque e a cor conforme o resultado: verde, amarelo ou laranja.
  const details = document.createElement('div');
  details.className = `records-v30-client-feedback-history v2-rating-card ${feedback.score >= 4 ? 'good' : feedback.score === 3 ? 'neutral' : 'low'}`;
  details.dataset.signature = signature;

  const score = document.createElement('div');
  score.className = 'v2-rating-score';
  const face = document.createElement('span');
  face.textContent = emojiForScore(feedback.score);
  const value = document.createElement('strong');
  value.textContent = `${feedback.score}/5`;
  score.append(face, value);

  const body = document.createElement('div');
  body.className = 'v2-rating-body';
  const left = document.createElement('span');
  left.textContent = 'Sua avaliação deste atendimento';
  body.append(left);
  if (feedback.comment?.trim()) { const comment = document.createElement('p'); comment.textContent = feedback.comment.trim(); body.append(comment); }
  const date = document.createElement('small');
  date.textContent = `Registrada em ${formatDate(feedback.created_at)}`;
  body.append(date);
  details.append(score, body);

  const locked = target.querySelector<HTMLElement>('.records-v27-chat-locked');
  if (locked?.parentElement) locked.parentElement.insertBefore(details, locked);
  else target.querySelector(":is(.records-v13-conversation,[data-v2-operation~=\"records-v13-conversation\"])")?.append(details);
}

async function enhance() {
  if (busy || !recordsAvailable) return;
  const role = currentRole();
  const target = drawer();
  if (!role || !target) return;
  const protocol = protocolFromDrawer(target);
  if (!protocol.startsWith('CALI-REG-')) return;
  if (protocol !== lastProtocol) {
    lastProtocol = protocol;
    dismissedAdminRequest = '';
  }
  busy = true;
  try {
    const ctx = await readRecordClosureContext(protocol, role);
    if (!ctx || !document.body.contains(target)) return;
    if (role === 'client') {
      renderClientFeedback(target, ctx);
      renderClientReopen(target, ctx);
      renderClientFeedbackHistory(target, ctx.feedback);
      remove('.records-v29-admin-feedback', target);
      remove('.records-v29-admin-reopen-overlay', target);
      remove('.records-v29-reopen-banner', target);
    } else {
      renderAdminFeedback(target, ctx);
      renderAdminReopen(target, ctx);
      polishAdminReopen(target, ctx);
      remove('.records-v29-feedback-overlay', target);
      remove('.records-v29-reopen-overlay', target);
    }
  } finally { busy = false; }
}

export function installRecordsClosureExperienceRuntime() {
  if (installed) return;
  installed = true;
  const heartbeat = () => {
    const role = currentRole();
    const target = drawer();
    if (!role || !target) {
      if (!role) lastProtocol = '';
      return;
    }
    void enhance();
  };
  heartbeat();
  window.setInterval(heartbeat, 1100);
  window.addEventListener('focus', heartbeat);
  window.addEventListener('popstate', () => { dismissedAdminRequest = ''; heartbeat(); });
}
