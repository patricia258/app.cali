import { supabase } from './supabase';
import '../records-v28-closure-experience.css';

type Role = 'admin' | 'client';
type RecordRow = {
  id: string;
  company_id: string;
  protocol?: string | null;
  title: string;
  record_type: string;
  workflow_status?: string | null;
};
type FeedbackRow = { score: number; comment?: string | null; created_at: string };
type ReopenRow = { id: string; reason?: string | null; requested_at: string; status: string; decision_note?: string | null };

type Context = { record: RecordRow; feedback: FeedbackRow | null; reopen: ReopenRow | null };

let installed = false;
let timer = 0;
let busy = false;
let dismissedAdminRequest = '';

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
function drawer() { return document.querySelector<HTMLElement>('.records-v13-drawer'); }
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
async function getContext(protocol: string): Promise<Context | null> {
  if (!supabase || !protocol.startsWith('CALI-REG-')) return null;
  const recordResult = await supabase.from('account_records').select('id,company_id,protocol,title,record_type,workflow_status').eq('protocol', protocol).maybeSingle();
  if (recordResult.error || !recordResult.data) return null;
  const record = recordResult.data as RecordRow;
  const [feedbackResult, reopenResult] = await Promise.all([
    supabase.from('account_record_feedback').select('score,comment,created_at').eq('record_id', record.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('account_record_reopen_requests').select('id,reason,requested_at,status,decision_note').eq('record_id', record.id).eq('status', 'pending').order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    record,
    feedback: feedbackResult.error ? null : (feedbackResult.data as FeedbackRow | null),
    reopen: reopenResult.error ? null : (reopenResult.data as ReopenRow | null),
  };
}
function remove(selector: string, target: ParentNode = document) { target.querySelectorAll(selector).forEach((node) => node.remove()); }
function createOverlay(target: HTMLElement, className: string) {
  remove(`.${className}`, target);
  const overlay = document.createElement('div');
  overlay.className = className;
  target.append(overlay);
  return overlay;
}
function button(label: string, className = 'primary') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  return el;
}

function renderClientFeedback(target: HTMLElement, ctx: Context) {
  target.querySelectorAll<HTMLElement>('.records-v27-feedback-overlay').forEach((node) => node.style.display = 'none');
  if (ctx.record.workflow_status !== 'completed' || ctx.feedback || target.dataset.v28FeedbackDone === '1') {
    remove('.records-v28-feedback-overlay', target);
    return;
  }
  const existing = target.querySelector<HTMLElement>('.records-v28-feedback-overlay');
  if (existing?.dataset.recordId === ctx.record.id) return;

  const overlay = createOverlay(target, 'records-v28-feedback-overlay');
  overlay.dataset.recordId = ctx.record.id;
  const card = document.createElement('section');
  card.className = 'records-v28-feedback-card';
  card.innerHTML = '<span class="records-v28-kicker">ANTES DE ENCERRAR</span><h3>Como foi este atendimento?</h3><p>Escolha uma nota de 1 a 5. Você pode revisar antes de enviar.</p>';
  const scores = document.createElement('div');
  scores.className = 'records-v28-score-grid';
  const response = document.createElement('div');
  response.className = 'records-v28-score-response';
  response.hidden = true;
  const textarea = document.createElement('textarea');
  textarea.rows = 4;
  textarea.placeholder = 'Conte em poucas palavras.';
  const textareaLabel = document.createElement('label');
  textareaLabel.textContent = 'Comentário';
  textareaLabel.append(textarea);
  const actions = document.createElement('div');
  actions.className = 'records-v28-actions';
  const submit = button('Enviar avaliação');
  submit.disabled = true;
  actions.append(submit);
  let selected = 0;

  for (const score of [1, 2, 3, 4, 5]) {
    const scoreButton = button(String(score), 'records-v28-score-button');
    scoreButton.onclick = () => {
      selected = score;
      scores.querySelectorAll('button').forEach((node) => node.classList.toggle('selected', node === scoreButton));
      const copy = messageForScore(score);
      response.hidden = false;
      response.innerHTML = `<div class="records-v28-score-message"><span>${emojiForScore(score)}</span><div><strong>${copy.title}</strong><p>${copy.copy}</p></div></div>`;
      textareaLabel.firstChild!.textContent = score <= 3 ? 'O que podemos melhorar? ' : 'Quer contar mais alguma coisa? ';
      textarea.placeholder = score <= 3 ? 'Sua justificativa é importante para entendermos o que pode melhorar.' : 'Opcional — escreva se quiser deixar um comentário.';
      response.append(textareaLabel, actions);
      submit.disabled = score <= 3 ? textarea.value.trim().length < 3 : false;
      if (score <= 3) window.setTimeout(() => textarea.focus(), 20);
    };
    scores.append(scoreButton);
  }
  textarea.oninput = () => { submit.disabled = !selected || (selected <= 3 && textarea.value.trim().length < 3); };
  submit.onclick = async () => {
    if (!supabase || !selected) return;
    if (selected <= 3 && textarea.value.trim().length < 3) return;
    submit.disabled = true;
    submit.textContent = 'Registrando…';
    const result = await supabase.rpc('submit_account_record_feedback', {
      p_record_id: ctx.record.id,
      p_score: selected,
      p_comment: textarea.value.trim() || null,
    });
    if (result.error) {
      submit.disabled = false;
      submit.textContent = 'Enviar avaliação';
      alert(result.error.message || 'Não foi possível registrar sua avaliação.');
      return;
    }
    target.dataset.v28FeedbackDone = '1';
    card.innerHTML = `<div class="records-v28-thanks"><span class="records-v28-thanks-icon">✓</span><span class="records-v28-kicker">AVALIAÇÃO REGISTRADA</span><h3>Obrigada pela sua avaliação.</h3><p>Sua nota <strong>${selected}/5</strong> ficou vinculada a esta solicitação. O histórico continua disponível para consulta.</p></div>`;
    const back = button('Voltar ao histórico');
    back.onclick = () => { overlay.remove(); schedule(); };
    card.querySelector('.records-v28-thanks')?.append(back);
  };
  card.append(scores, response);
  overlay.append(card);
}

function showClientReopenDialog(target: HTMLElement, ctx: Context) {
  const overlay = createOverlay(target, 'records-v28-reopen-overlay');
  const card = document.createElement('section');
  card.className = 'records-v28-reopen-card';
  card.innerHTML = `<span class="records-v28-kicker">SOLICITAR REABERTURA</span><h3>Por que você precisa reabrir esta solicitação?</h3><p>Explique brevemente o motivo. A CALI vai analisar antes de liberar novas mensagens.</p><div class="records-v28-hour-note"><strong>Importante</strong><span>O tempo já consumido continua contabilizado e não retorna ao saldo de horas.</span></div>`;
  const label = document.createElement('label');
  label.textContent = 'Justificativa da reabertura';
  const reason = document.createElement('textarea');
  reason.rows = 5;
  reason.placeholder = 'Ex.: surgiu uma nova informação e preciso retomar este assunto porque…';
  label.append(reason);
  const actions = document.createElement('div');
  actions.className = 'records-v28-actions split';
  const cancel = button('Cancelar', 'secondary');
  const send = button('Enviar para análise');
  send.disabled = true;
  cancel.onclick = () => overlay.remove();
  reason.oninput = () => { send.disabled = reason.value.trim().length < 3; };
  send.onclick = async () => {
    if (!supabase || reason.value.trim().length < 3) return;
    send.disabled = true;
    send.textContent = 'Enviando…';
    const result = await supabase.rpc('request_account_record_reopen', { p_record_id: ctx.record.id, p_reason: reason.value.trim() });
    if (result.error) {
      send.disabled = false;
      send.textContent = 'Enviar para análise';
      alert(result.error.message || 'Não foi possível solicitar a reabertura.');
      return;
    }
    card.innerHTML = '<div class="records-v28-thanks"><span class="records-v28-thanks-icon">✓</span><span class="records-v28-kicker">PEDIDO ENVIADO</span><h3>Reabertura solicitada.</h3><p>A CALI recebeu sua justificativa e vai analisar o pedido. Você será notificado quando houver uma decisão.</p></div>';
    const back = button('Voltar ao histórico');
    back.onclick = () => location.reload();
    card.querySelector('.records-v28-thanks')?.append(back);
  };
  card.append(label, actions);
  overlay.append(card);
  window.setTimeout(() => reason.focus(), 30);
}

function renderClientReopen(target: HTMLElement, ctx: Context) {
  const locked = target.querySelector<HTMLElement>('.records-v27-chat-locked');
  if (!locked) return;
  const legacy = Array.from(locked.querySelectorAll<HTMLButtonElement>(':scope > button')).find((item) => !item.classList.contains('records-v28-reopen-trigger'));
  if (legacy) legacy.style.display = 'none';
  let trigger = locked.querySelector<HTMLButtonElement>('.records-v28-reopen-trigger');
  if (!trigger) {
    trigger = button('Solicitar reabertura', 'secondary records-v28-reopen-trigger');
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
  remove('.records-v28-admin-feedback', target);
  if (!ctx.feedback) return;
  const card = document.createElement('section');
  card.className = `records-v28-admin-feedback score-${ctx.feedback.score}`;
  card.innerHTML = `<div class="records-v28-admin-score"><span>${emojiForScore(ctx.feedback.score)}</span><strong>${ctx.feedback.score}<small>/5</small></strong></div><div><span class="records-v28-kicker">AVALIAÇÃO DO CLIENTE</span><strong>${messageForScore(ctx.feedback.score).title}</strong><p>${ctx.feedback.comment ? ctx.feedback.comment : 'O cliente não deixou comentário adicional.'}</p><small>Registrada ${formatDate(ctx.feedback.created_at)}</small></div>`;
  const host = target.querySelector<HTMLElement>('.records-v25-ops');
  if (host) host.append(card);
  else target.querySelector('.records-v13-conversation')?.before(card);
}

function showAdminReopenOverlay(target: HTMLElement, ctx: Context) {
  if (!ctx.reopen) return;
  dismissedAdminRequest = '';
  const overlay = createOverlay(target, 'records-v28-admin-reopen-overlay');
  overlay.dataset.requestId = ctx.reopen.id;
  const card = document.createElement('section');
  card.className = 'records-v28-admin-reopen-card';
  const company = target.querySelector<HTMLElement>('header p')?.textContent?.split(' · ')[0]?.trim() || 'Cliente';
  const reason = ctx.reopen.reason?.trim() || 'Motivo não informado — este pedido foi criado antes da nova regra de justificativa obrigatória.';
  card.innerHTML = `<span class="records-v28-kicker">PEDIDO DE REABERTURA</span><h3>O cliente quer retomar esta solicitação.</h3><div class="records-v28-reopen-summary"><div><span>Cliente</span><strong>${company}</strong></div><div><span>Protocolo</span><strong>${ctx.record.protocol || '—'}</strong></div><div><span>Status atual</span><strong>${statusLabel(ctx.record.workflow_status)}</strong></div><div><span>Solicitado</span><strong>${formatDate(ctx.reopen.requested_at)}</strong></div></div><div class="records-v28-reason-box"><span>JUSTIFICATIVA DO CLIENTE</span><p>${reason}</p></div>${ctx.feedback ? `<div class="records-v28-feedback-inline"><span>${emojiForScore(ctx.feedback.score)}</span><div><small>AVALIAÇÃO DESTA SOLICITAÇÃO</small><strong>${ctx.feedback.score}/5</strong><p>${ctx.feedback.comment || 'Sem comentário adicional.'}</p></div></div>` : ''}`;
  const label = document.createElement('label');
  label.textContent = 'Mensagem ao cliente';
  const note = document.createElement('textarea');
  note.rows = 4;
  note.placeholder = 'Opcional ao reabrir. Obrigatória se você recusar o pedido.';
  label.append(note);
  const error = document.createElement('small');
  error.className = 'records-v28-inline-error';
  error.hidden = true;
  const actions = document.createElement('div');
  actions.className = 'records-v28-actions admin';
  const history = button('Ver histórico antes de decidir', 'secondary records-v28-history-button');
  const reject = button('Recusar', 'secondary records-v28-reject-button');
  const approve = button('Reabrir atendimento');
  history.onclick = () => {
    dismissedAdminRequest = ctx.reopen!.id;
    overlay.remove();
    renderAdminPendingBanner(target, ctx);
  };
  const decide = async (decision: 'approved' | 'rejected') => {
    if (!supabase || !ctx.reopen) return;
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
    const result = await supabase.rpc('decide_account_record_reopen', {
      p_request_id: ctx.reopen.id,
      p_decision: decision,
      p_note: note.value.trim() || null,
    });
    if (result.error) {
      approve.disabled = false;
      reject.disabled = false;
      history.disabled = false;
      error.hidden = false;
      error.textContent = result.error.message || 'Não foi possível registrar a decisão.';
      return;
    }
    card.innerHTML = `<div class="records-v28-thanks"><span class="records-v28-thanks-icon">✓</span><span class="records-v28-kicker">DECISÃO REGISTRADA</span><h3>${decision === 'approved' ? 'Atendimento reaberto.' : 'Pedido de reabertura recusado.'}</h3><p>O cliente será notificado e receberá sua mensagem.</p></div>`;
    window.setTimeout(() => location.reload(), 900);
  };
  reject.onclick = () => void decide('rejected');
  approve.onclick = () => void decide('approved');
  actions.append(history, reject, approve);
  card.append(label, error, actions);
  overlay.append(card);
  const footer = target.querySelector<HTMLElement>('.records-v13-drawer-actions');
  footer?.querySelectorAll<HTMLButtonElement>('button').forEach((item) => {
    if (/aprovar reabertura|^reabrir$/i.test(item.textContent?.trim() || '')) item.style.display = 'none';
  });
}

function renderAdminPendingBanner(target: HTMLElement, ctx: Context) {
  remove('.records-v28-reopen-banner', target);
  if (!ctx.reopen) return;
  const banner = document.createElement('div');
  banner.className = 'records-v28-reopen-banner';
  banner.innerHTML = '<div><span>PEDIDO DE REABERTURA PENDENTE</span><strong>Decisão aguardando sua análise.</strong></div>';
  const review = button('Rever pedido', 'secondary');
  review.onclick = () => showAdminReopenOverlay(target, ctx);
  banner.append(review);
  const host = target.querySelector<HTMLElement>('.records-v25-ops');
  if (host) host.prepend(banner);
  else target.querySelector('.records-v13-conversation')?.before(banner);
}

function renderAdminReopen(target: HTMLElement, ctx: Context) {
  remove('.records-v28-reopen-banner', target);
  if (!ctx.reopen) {
    remove('.records-v28-admin-reopen-overlay', target);
    return;
  }
  target.querySelector<HTMLElement>('.records-v13-drawer-actions')?.querySelectorAll<HTMLButtonElement>('button').forEach((item) => {
    if (/aprovar reabertura|^reabrir$/i.test(item.textContent?.trim() || '')) item.style.display = 'none';
  });
  if (dismissedAdminRequest === ctx.reopen.id) renderAdminPendingBanner(target, ctx);
  else showAdminReopenOverlay(target, ctx);
}

async function enhance() {
  if (busy || !supabase) return;
  const role = currentRole();
  const target = drawer();
  if (!role || !target) return;
  const protocol = protocolFromDrawer(target);
  if (!protocol.startsWith('CALI-REG-')) return;
  busy = true;
  try {
    const ctx = await getContext(protocol);
    if (!ctx || !document.body.contains(target)) return;
    if (role === 'client') {
      renderClientFeedback(target, ctx);
      renderClientReopen(target, ctx);
      remove('.records-v28-admin-feedback', target);
      remove('.records-v28-admin-reopen-overlay', target);
      remove('.records-v28-reopen-banner', target);
    } else {
      renderAdminFeedback(target, ctx);
      renderAdminReopen(target, ctx);
      remove('.records-v28-feedback-overlay', target);
      remove('.records-v28-reopen-overlay', target);
    }
  } finally { busy = false; }
}
function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void enhance(), 110);
}

export function installRecordsClosureExperienceRuntimeV28() {
  if (installed) return;
  installed = true;
  const start = () => {
    schedule();
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('focus', schedule);
    window.addEventListener('popstate', () => { dismissedAdminRequest = ''; schedule(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
