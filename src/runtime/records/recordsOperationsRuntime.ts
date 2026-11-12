import { recordsAvailable, readRecordViewerId } from '../../api/records/client';
import {
  deleteUnopenedRecord, markRecordOpened, pauseRecordTimer, readRecordOperations,
  readRecordTimerData, startRecordTimer, subscribeRecordOperations, type RecordOperationsRow as RecordRow,
} from '../../api/records/operations';

type Role = 'admin' | 'client';
let installed = false;
let busy = false;
let debounce = 0;
let activeRecord = '';
let unsubscribeRecord: (() => void) | null = null;
let ticker = 0;

function role(): Role | null {
  if (location.pathname.startsWith('/admin/registros')) return 'admin';
  if (location.pathname.startsWith('/cliente/registros')) return 'client';
  return null;
}
function formatMinutes(total = 0) {
  const minutes = Math.max(0, Math.round(total));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}
function formatLive(startedAt: string, pausedSeconds = 0) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) - pausedSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':');
}
function currentProtocol(drawer: HTMLElement) {
  return drawer.querySelector<HTMLElement>('.section-kicker')?.textContent?.trim() || '';
}
function ensureOperationalHost(drawer: HTMLElement) {
  let host = drawer.querySelector<HTMLElement>('.records-v25-ops');
  if (host) return host;
  host = document.createElement('section');
  host.className = 'records-v25-ops';
  const footer = drawer.querySelector<HTMLElement>('.records-v13-drawer-actions');
  if (footer) footer.parentElement?.insertBefore(host, footer);
  else drawer.append(host);
  return host;
}
async function markOpened(record: RecordRow) {
  if (!recordsAvailable || record.first_admin_opened_at) return;
  const { error } = await markRecordOpened(record.id);
  if (!error) record.first_admin_opened_at = new Date().toISOString();
}
async function deleteUnopened(record: RecordRow, button: HTMLButtonElement) {
  if (!recordsAvailable) return;
  const confirmed = window.confirm('Excluir esta solicitação? Isso só é possível porque a CALI ainda não abriu o atendimento.');
  if (!confirmed) return;
  button.disabled = true;
  const { error } = await deleteUnopenedRecord(record.id);
  if (error) {
    button.disabled = false;
    alert(error.message || 'Não foi possível excluir esta solicitação.');
    return;
  }
  document.querySelector<HTMLButtonElement>(":is(.records-v13-drawer,[data-v2-operation~=\"records-v13-drawer\"]) .drawer-close")?.click();
  window.setTimeout(() => location.reload(), 120);
}
async function renderClientDelete(record: RecordRow, host: HTMLElement) {
  if (!recordsAvailable) return;
  const uid = await readRecordViewerId();
  const deletable =
    record.source_actor === 'client' &&
    record.created_by === uid &&
    record.workflow_status === 'open' &&
    !record.first_admin_opened_at;

  let row = host.querySelector<HTMLElement>('.records-v25-client-delete');
  if (!deletable) {
    row?.remove();
    return;
  }
  if (!row) {
    row = document.createElement('div');
    row.className = 'records-v25-client-delete';
    const copy = document.createElement('div');
    copy.innerHTML = '<strong>Ainda não foi aberta pela CALI</strong><span>Você pode excluir esta solicitação enquanto ela não tiver sido visualizada pela Patrícia.</span>';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'records-v25-delete-button';
    button.textContent = 'Excluir solicitação';
    button.onclick = () => void deleteUnopened(record, button);
    row.append(copy, button);
    host.append(row);
  }
}
function stopTicker() {
  if (ticker) window.clearInterval(ticker);
  ticker = 0;
}
async function startTimer(record: RecordRow, button: HTMLButtonElement) {
  if (!recordsAvailable) return;
  button.disabled = true;
  const { error } = await startRecordTimer(record.id);
  button.disabled = false;
  if (error) {
    alert(error.message || 'Não foi possível iniciar o acompanhamento.');
    return;
  }
  window.dispatchEvent(new CustomEvent('cali:timers-changed'));
  schedule();
}
async function pauseTimer(timerId: string, button: HTMLButtonElement, startedAt?: string, pausedSeconds = 0) {
  if (!recordsAvailable) return;
  // Regra do banco (2026-10-11): sessão com menos de 30 segundos é descartada, sem lançamento de horas.
  const elapsed = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) - pausedSeconds : 999;
  button.disabled = true;
  const { error } = await pauseRecordTimer(timerId);
  button.disabled = false;
  if (error) {
    alert(error.message || 'Não foi possível pausar e registrar esta sessão.');
    return;
  }
  window.dispatchEvent(new CustomEvent('cali:timers-changed'));
  schedule();
  if (elapsed < 30) window.setTimeout(() => {
    const card = document.querySelector<HTMLElement>('.records-v25-timer');
    if (!card) return;
    card.dataset.note = 'Sessão com menos de 30 segundos: não foi registrada.';
    window.setTimeout(() => { delete card.dataset.note; }, 6000);
  }, 500);
}
async function renderAdminTimer(record: RecordRow, host: HTMLElement) {
  const data = await readRecordTimerData(record.id);
  let card = host.querySelector<HTMLElement>('.records-v25-timer');
  const locked = ['completed', 'cancelled'].includes(String(record.workflow_status || ''));
  const signature = [data.timer?.id || 'idle', data.total, data.sessions, locked ? 'locked' : 'open'].join('|');
  if (card?.dataset.timerSignature === signature) return;

  stopTicker();
  if (!card) {
    card = document.createElement('div');
    card.className = 'records-v25-timer';
    host.prepend(card);
  }
  card.dataset.timerSignature = signature;
  card.replaceChildren();

  const copy = document.createElement('div');
  copy.className = 'records-v25-timer-copy';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = 'TEMPO DE ACOMPANHAMENTO';
  const title = document.createElement('strong');
  title.textContent = data.timer ? 'Atendimento em andamento' : 'Tempo desta interação';
  const detail = document.createElement('small');
  detail.textContent = `${formatMinutes(data.total)} registrados · ${data.sessions} sessão${data.sessions === 1 ? '' : 'ões'}. Este tempo entra nos indicadores de ocorrências e solicitações.`;
  copy.append(eyebrow, title, detail);

  const action = document.createElement('div');
  action.className = 'records-v25-timer-action';
  const clock = document.createElement('b');
  clock.textContent = data.timer ? formatLive(data.timer.started_at, Number(data.timer.paused_seconds || 0)) : formatMinutes(data.total);
  // O número muda de sentido: parado = total já registrado (minutos); em andamento = sessão atual (hh:mm:ss).
  clock.dataset.label = data.timer ? 'Sessão atual' : 'Total';
  clock.title = data.timer ? `Sessão em andamento. Já registrados nesta ocorrência: ${formatMinutes(data.total)} em ${data.sessions} ${data.sessions === 1 ? 'sessão' : 'sessões'}. Ao pausar, a sessão entra no total.` : `${formatMinutes(data.total)} registrados em ${data.sessions} ${data.sessions === 1 ? 'sessão' : 'sessões'}.`;
  const button = document.createElement('button');
  button.type = 'button';

  if (data.timer) {
    card.classList.add('is-active');
    button.className = 'records-v25-timer-pause';
    button.textContent = 'Pausar e registrar';
    button.onclick = () => void pauseTimer(data.timer!.id, button, data.timer!.started_at, Number(data.timer!.paused_seconds || 0));
    ticker = window.setInterval(() => {
      if (document.body.contains(clock)) clock.textContent = formatLive(data.timer!.started_at, Number(data.timer!.paused_seconds || 0));
      else stopTicker();
    }, 1000);
  } else {
    card.classList.remove('is-active');
    button.className = 'records-v25-timer-start';
    button.textContent = locked ? 'Atendimento encerrado' : 'Iniciar acompanhamento';
    button.disabled = locked;
    button.onclick = () => void startTimer(record, button);
  }
  action.append(clock, button);
  card.append(copy, action);
}
function clearRecordSubscription() {
  unsubscribeRecord?.();
  unsubscribeRecord = null;
  activeRecord = '';
  stopTicker();
}

function subscribeRecord(recordId: string) {
  if (recordId === activeRecord && unsubscribeRecord) return;
  clearRecordSubscription();
  activeRecord = recordId;
  unsubscribeRecord = subscribeRecordOperations(recordId, schedule);
}
async function enhance() {
  if (busy || !recordsAvailable) return;
  const currentRole = role();
  if (!currentRole) { clearRecordSubscription(); return; }
  const drawer = document.querySelector<HTMLElement>(":is(.records-v13-drawer,[data-v2-operation~=\"records-v13-drawer\"])");
  if (!drawer) { clearRecordSubscription(); return; }
  const protocol = currentProtocol(drawer);
  if (!protocol.startsWith('CALI-REG-')) return;
  busy = true;
  try {
    const record = await readRecordOperations(protocol);
    if (!record || !drawer.isConnected || role() !== currentRole) return;
    subscribeRecord(record.id);
    const host = ensureOperationalHost(drawer);
    if (currentRole === 'admin') {
      await markOpened(record);
      await renderAdminTimer(record, host);
      host.querySelector('.records-v25-client-delete')?.remove();
    } else {
      host.querySelector('.records-v25-timer')?.remove();
      await renderClientDelete(record, host);
    }
  } finally {
    busy = false;
  }
}
function schedule() {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => void enhance(), 90);
}

export function installRecordsOperationsRuntime() {
  if (installed) return;
  installed = true;
  const start = () => {
    schedule();
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('cali-route-change', schedule);
    window.addEventListener('popstate', schedule);
    window.addEventListener('focus', schedule);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
