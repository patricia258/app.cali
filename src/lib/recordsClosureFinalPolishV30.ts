import { supabase } from './supabase';
import '../records-v30-final-polish.css';

type RecordContext = {
  id: string;
  protocol: string | null;
  workflow_status: string | null;
  created_at: string | null;
  closed_at: string | null;
};

type Feedback = {
  score: number;
  comment: string | null;
  created_at: string;
};

let installed = false;
let busy = false;
let lastProtocol = '';
let lastLoadedAt = 0;
let cached: { record: RecordContext; feedback: Feedback | null } | null = null;

function isRecordsRoute() {
  return location.pathname.startsWith('/admin/registros') || location.pathname.startsWith('/cliente/registros');
}

function isClientRoute() {
  return location.pathname.startsWith('/cliente/registros');
}

function drawer() {
  return document.querySelector<HTMLElement>('.records-v13-drawer');
}

function protocolFromDrawer(target: HTMLElement) {
  return target.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || '';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace('.', '');
}

function statusLabel(status?: string | null) {
  if (status === 'completed') return 'Finalizada';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'standby') return 'Stand by';
  if (status === 'waiting_client') return 'Aguardando cliente';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'open') return 'Aberta';
  return '—';
}

function emoji(score: number) {
  if (score <= 2) return '😞';
  if (score === 3) return '😐';
  if (score === 4) return '😊';
  return '🤩';
}

async function loadContext(protocol: string) {
  if (!supabase || !protocol.startsWith('CALI-REG-')) return null;
  const now = Date.now();
  if (cached && protocol === lastProtocol && now - lastLoadedAt < 5000) return cached;

  const recordResult = await supabase
    .from('account_records')
    .select('id,protocol,workflow_status,created_at,closed_at')
    .eq('protocol', protocol)
    .maybeSingle();
  if (recordResult.error || !recordResult.data) return null;

  const record = recordResult.data as RecordContext;
  const feedbackResult = await supabase
    .from('account_record_feedback')
    .select('score,comment,created_at')
    .eq('record_id', record.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  cached = {
    record,
    feedback: feedbackResult.error ? null : (feedbackResult.data as Feedback | null),
  };
  lastProtocol = protocol;
  lastLoadedAt = now;
  return cached;
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
    opened.innerHTML = `<small>Abertura</small><strong>${formatDateTime(ctx.record.created_at)}</strong>`;
    const closed = document.createElement('p');
    closed.innerHTML = `<small>Finalização</small><strong>${formatDateTime(ctx.record.closed_at)}</strong>`;
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

  const details = document.createElement('details');
  details.className = 'records-v30-client-feedback-history';
  details.dataset.signature = signature;

  const summary = document.createElement('summary');
  const left = document.createElement('span');
  left.className = 'records-v30-client-feedback-label';
  left.textContent = 'Sua avaliação deste atendimento';
  const score = document.createElement('strong');
  score.textContent = `${emoji(feedback.score)} ${feedback.score}/5`;
  summary.append(left, score);

  const body = document.createElement('div');
  body.className = 'records-v30-client-feedback-body';
  const comment = document.createElement('p');
  comment.textContent = feedback.comment?.trim() || 'Você não deixou comentário adicional.';
  const date = document.createElement('small');
  date.textContent = `Avaliação registrada em ${formatDateTime(feedback.created_at)}.`;
  body.append(comment, date);
  details.append(summary, body);

  const locked = target.querySelector<HTMLElement>('.records-v27-chat-locked');
  if (locked?.parentElement) locked.parentElement.insertBefore(details, locked);
  else target.querySelector('.records-v13-conversation')?.append(details);
}

async function enhance() {
  if (busy || !supabase || !isRecordsRoute()) return;
  const target = drawer();
  if (!target) return;
  const protocol = protocolFromDrawer(target);
  if (!protocol.startsWith('CALI-REG-')) return;

  busy = true;
  try {
    const ctx = await loadContext(protocol);
    if (!ctx || !document.body.contains(target)) return;
    if (isClientRoute()) renderClientFeedbackHistory(target, ctx.feedback);
    else polishAdminReopen(target, ctx);
  } finally {
    busy = false;
  }
}

export function installRecordsClosureFinalPolishV30() {
  if (installed) return;
  installed = true;
  const heartbeat = () => {
    if (!isRecordsRoute()) {
      lastProtocol = '';
      cached = null;
      return;
    }
    void enhance();
  };
  heartbeat();
  window.setInterval(heartbeat, 900);
  window.addEventListener('focus', () => {
    lastLoadedAt = 0;
    heartbeat();
  });
  window.addEventListener('popstate', () => {
    lastProtocol = '';
    cached = null;
    heartbeat();
  });
}
