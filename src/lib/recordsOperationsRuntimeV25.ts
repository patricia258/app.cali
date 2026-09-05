import { supabase } from './supabase';

type Role = 'admin' | 'client';
type RecordRow = {
  id: string;
  company_id: string;
  protocol?: string | null;
  title: string;
  record_type: string;
  source_actor: string;
  created_by?: string | null;
  workflow_status?: string | null;
  first_admin_opened_at?: string | null;
};
type TimerRow = {
  id: string;
  started_at: string;
  paused_seconds?: number | null;
};

let installed = false;
let busy = false;
let debounce = 0;
let activeRecord = '';
let recordChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
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
async function getRecord(protocol: string): Promise<RecordRow | null> {
  if (!supabase || !protocol.startsWith('CALI-REG-')) return null;
  const { data, error } = await supabase
    .from('account_records')
    .select('id,company_id,protocol,title,record_type,source_actor,created_by,workflow_status,first_admin_opened_at')
    .eq('protocol', protocol)
    .maybeSingle();
  if (error || !data) return null;
  return data as RecordRow;
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
  if (!supabase || record.first_admin_opened_at) return;
  const { error } = await supabase.rpc('mark_account_record_opened', { p_record_id: record.id });
  if (!error) record.first_admin_opened_at = new Date().toISOString();
}
async function deleteUnopened(record: RecordRow, button: HTMLButtonElement) {
  if (!supabase) return;
  const confirmed = window.confirm('Excluir esta solicitação? Isso só é possível porque a CALI ainda não abriu o atendimento.');
  if (!confirmed) return;
  button.disabled = true;
  const { error } = await supabase.rpc('client_delete_unopened_account_record', { p_record_id: record.id });
  if (error) {
    button.disabled = false;
    alert(error.message || 'Não foi possível excluir esta solicitação.');
    return;
  }
  document.querySelector<HTMLButtonElement>('.records-v13-drawer .drawer-close')?.click();
  window.setTimeout(() => location.reload(), 120);
}
async function renderClientDelete(record: RecordRow, host: HTMLElement) {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id || '';
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
async function timerData(recordId: string) {
  if (!supabase) return { timer: null as TimerRow | null, total: 0, sessions: 0 };
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id || '';
  const [timerResult, hoursResult] = await Promise.all([
    supabase
      .from('work_timers')
      .select('id,started_at,paused_seconds')
      .eq('account_record_id', recordId)
      .eq('user_id', uid)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('hour_entries')
      .select('minutes')
      .eq('account_record_id', recordId),
  ]);
  const minutes = (hoursResult.data || []).reduce((sum: number, row: any) => sum + Number(row.minutes || 0), 0);
  return { timer: (timerResult.data || null) as TimerRow | null, total: minutes, sessions: (hoursResult.data || []).length };
}
function stopTicker() {
  if (ticker) window.clearInterval(ticker);
  ticker = 0;
}
async function startTimer(record: RecordRow, button: HTMLButtonElement) {
  if (!supabase) return;
  button.disabled = true;
  const { error } = await supabase.rpc('start_account_record_timer', { p_record_id: record.id });
  button.disabled = false;
  if (error) {
    alert(error.message || 'Não foi possível iniciar o acompanhamento.');
    return;
  }
  window.dispatchEvent(new CustomEvent('cali:timers-changed'));
  schedule();
}
async function pauseTimer(timerId: string, button: HTMLButtonElement) {
  if (!supabase) return;
  button.disabled = true;
  const { error } = await supabase.rpc('pause_work_timer', { p_timer_id: timerId });
  button.disabled = false;
  if (error) {
    alert(error.message || 'Não foi possível pausar e registrar esta sessão.');
    return;
  }
  window.dispatchEvent(new CustomEvent('cali:timers-changed'));
  schedule();
}
async function renderAdminTimer(record: RecordRow, host: HTMLElement) {
  stopTicker();
  const data = await timerData(record.id);
  let card = host.querySelector<HTMLElement>('.records-v25-timer');
  if (!card) {
    card = document.createElement('div');
    card.className = 'records-v25-timer';
    host.prepend(card);
  }
  const locked = ['completed', 'cancelled'].includes(String(record.workflow_status || ''));
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
  const button = document.createElement('button');
  button.type = 'button';

  if (data.timer) {
    card.classList.add('is-active');
    button.className = 'records-v25-timer-pause';
    button.textContent = 'Pausar e registrar';
    button.onclick = () => void pauseTimer(data.timer!.id, button);
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
function subscribeRecord(recordId: string) {
  if (!supabase || (recordId === activeRecord && recordChannel)) return;
  if (recordChannel) void supabase.removeChannel(recordChannel);
  activeRecord = recordId;
  recordChannel = supabase
    .channel(`records-ops-${recordId}-${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'cali_workspace', table: 'account_records', filter: `id=eq.${recordId}` }, () => schedule())
    .on('postgres_changes', { event: 'DELETE', schema: 'cali_workspace', table: 'account_records', filter: `id=eq.${recordId}` }, () => location.reload())
    .subscribe();
}
async function enhance() {
  if (busy || !supabase) return;
  const currentRole = role();
  if (!currentRole) return;
  const drawer = document.querySelector<HTMLElement>('.records-v13-drawer');
  if (!drawer) return;
  const protocol = currentProtocol(drawer);
  if (!protocol.startsWith('CALI-REG-')) return;
  busy = true;
  try {
    const record = await getRecord(protocol);
    if (!record) return;
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

export function installRecordsOperationsRuntimeV25() {
  if (installed) return;
  installed = true;
  const start = () => {
    schedule();
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', schedule);
    window.addEventListener('focus', schedule);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
