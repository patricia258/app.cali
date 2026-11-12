import style from './google-calendar-runtime.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import {
  observeCalendarEventSync, readAdminGoogleConnection, readGoogleCalendarEvent,
  refreshGoogleCalendarEvent, runGoogleCalendarOperation,
} from '../../api/calendar/sync';
import { isWorkspaceRoute } from '../routeActivity';

let installed = false;
let unsubscribeRealtime: (() => void) | null = null;
let observer: MutationObserver | null = null;
let enhanceTimer: number | undefined;
let renderInFlight = false;
let lastRenderKey = '';
let lastPath = typeof window !== 'undefined' ? window.location.pathname : '';
let connectionCache: any = null;
let connectionCacheAt = 0;

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}
function ensureStyle() { if (document.getElementById('google-calendar-runtime-style')) return; const el = document.createElement('style'); el.id = 'google-calendar-runtime-style'; el.textContent = style; document.head.appendChild(el); }
function isCalendar() { return window.location.pathname === '/admin/calendario'; }
function setCopy(copy: HTMLElement | null, text: string) { if (copy && copy.textContent !== text) copy.textContent = text; }
function setHost(host: HTMLElement, html: string, key: string) { if (lastRenderKey === key && host.dataset.googleRenderKey === key) return; host.innerHTML = html; host.dataset.googleRenderKey = key; lastRenderKey = key; }
function extractProtocol(text: string) { return text.match(/CALI-[A-Z]+-\d{4}-\d+/i)?.[0] || null; }
function protocolFromOpenModal() { return extractProtocol(document.querySelector<HTMLElement>('.calendar-detail-modal .calendar-protocol-badge')?.textContent || ''); }

async function getOwnConnection(force = false) {
  if (!isSupabaseConfigured) return null;
  if (!force && Date.now() - connectionCacheAt < 120000) return connectionCache;
  connectionCache = await readAdminGoogleConnection();
  connectionCacheAt = Date.now();
  return connectionCache;
}
async function renderConnection() {
  if (!isCalendar() || !isSupabaseConfigured || renderInFlight) return;
  const strip = document.querySelector<HTMLElement>('.calendar-workspace-strip');
  if (!strip) return;
  let host = strip.querySelector<HTMLElement>('.google-calendar-runtime-actions');
  if (!host) { host = document.createElement('div'); host.className = 'google-calendar-runtime-actions'; strip.appendChild(host); }
  if (host.dataset.googleConnectionReady === '1' && Date.now() - connectionCacheAt < 120000) return;
  if (!host.childElementCount) host.innerHTML = '<span class="google-calendar-runtime-detail">Verificando integração...</span>';
  renderInFlight = true;
  try {
    const [config, connection] = await Promise.all([runGoogleCalendarOperation({ action: 'config' }), getOwnConnection()]);
    const originalStatus = strip.querySelector<HTMLElement>('.calendar-connection-status'); if (originalStatus) originalStatus.style.display = 'none';
    const copy = strip.querySelector<HTMLElement>('div:nth-child(2) p');
    if (!config?.configured) {
      setCopy(copy, 'A integração está preparada, mas as credenciais Google ainda não estão completas.');
      const key = `missing:${Boolean(config?.parts?.clientId)}:${Boolean(config?.parts?.clientSecret)}:${Boolean(config?.parts?.redirectUri)}`;
      setHost(host, `<span class="google-calendar-runtime-detail">Client ID: ${config?.parts?.clientId ? 'OK' : 'faltando'} · Secret: ${config?.parts?.clientSecret ? 'OK' : 'faltando'} · Redirect: ${config?.parts?.redirectUri ? 'OK' : 'faltando'}</span>`, key);
      return;
    }
    if (connection) {
      const email = String(connection.account_email || 'Google Calendar');
      setCopy(copy, `Conectado a ${email}. Os compromissos sincronizados pela CALI são gravados nesta agenda.`);
      setHost(host, `<span class="google-calendar-runtime-detail">Conectado · ${esc(email)}</span><button type="button" class="google-calendar-runtime-button" data-google-calendar-reconnect>Atualizar conexão</button><button type="button" class="google-calendar-runtime-button" data-google-calendar-disconnect>Desconectar</button>`, `connected:${email}`);
      host.dataset.googleConnectionReady = '1';
      return;
    }
    setCopy(copy, 'Conecte sua agenda Google para sincronizar os compromissos da CALI.');
    setHost(host, '<button type="button" class="google-calendar-runtime-button primary" data-google-calendar-connect>Conectar Google Calendar</button>', 'disconnected');
    host.dataset.googleConnectionReady = '1';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro';
    setHost(host, `<span class="google-calendar-runtime-detail">Não foi possível verificar a integração: ${esc(message)}</span>`, `error:${message}`);
  } finally { renderInFlight = false; }
}

function applyAttendeeStatuses(refreshed: any) {
  if (!refreshed?.attendees) return;
  const statusMap = new Map<string, string>((refreshed.attendees || []).map((item: any) => [String(item.email || '').toLowerCase(), String(item.status || 'pending')]));
  document.querySelectorAll<HTMLElement>('.calendar-attendee-list > div').forEach((row) => {
    const email = row.querySelector('small')?.textContent?.trim().toLowerCase() || '', status = statusMap.get(email); if (!status) return;
    const badge = row.querySelector('b'); if (badge) badge.textContent = status === 'accepted' ? 'Aceito' : status === 'declined' ? 'Recusado' : status === 'tentative' ? 'Talvez' : 'Pendente';
    const dot = row.querySelector<HTMLElement>('.attendee-status'); if (dot) dot.className = `attendee-status ${status}`;
  });
}

async function enhanceOpenEventModal() {
  if (!isCalendar() || !isSupabaseConfigured) return;
  const modal = document.querySelector<HTMLElement>('.calendar-detail-modal'); if (!modal) return;
  const protocol = protocolFromOpenModal(); if (!protocol) return;
  if (modal.dataset.googleEnhancedProtocol === protocol || modal.dataset.googleEnhancingProtocol === protocol) return;
  modal.dataset.googleEnhancingProtocol = protocol;
  try {
    let { data: eventRow } = await readGoogleCalendarEvent({ protocol });
    if (!eventRow) return;
    if (eventRow.google_event_id) {
      const refreshed = await refreshGoogleCalendarEvent(String(eventRow.id)); applyAttendeeStatuses(refreshed);
      const latest = await readGoogleCalendarEvent({ id: eventRow.id }); if (latest.data) eventRow = latest.data;
    }
    const connection = await getOwnConnection();
    const body = modal.querySelector<HTMLElement>('.calendar-detail-body');
    if (body && !body.querySelector('.google-calendar-runtime-event-meta')) {
      const meta = document.createElement('div'); meta.className = 'google-calendar-runtime-event-meta';
      const account = connection?.account_email ? ` · ${esc(connection.account_email)}` : '';
      meta.innerHTML = `<span><strong>Google</strong> · ${eventRow.sync_status === 'synced' ? `sincronizado${account}` : eventRow.sync_status === 'error' ? 'erro de sincronização' : 'aguardando sincronização'}</span><span><strong>Lembrete</strong> · ${Number(eventRow.reminder_minutes || 0) > 0 ? `${eventRow.reminder_minutes} min antes` : 'sem lembrete'}</span>${eventRow.meeting_url ? `<span><strong>Meet</strong> · ${eventRow.auto_transcription ? 'transcrição automática' : 'transcrição manual'}</span>` : ''}`;
      body.appendChild(meta);
    }
    const footer = modal.querySelector<HTMLElement>('.calendar-detail-footer');
    if (footer) {
      const googleButton = Array.from(footer.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim().includes('Google Calendar'));
      if (googleButton && eventRow.google_html_link) { googleButton.dataset.googleCalendarExactUrl = String(eventRow.google_html_link); googleButton.textContent = 'Abrir no Google Agenda'; }
      if (!footer.querySelector('[data-google-delete-event]')) { const deleteButton = document.createElement('button'); deleteButton.type = 'button'; deleteButton.className = 'secondary google-calendar-runtime-delete'; deleteButton.dataset.googleDeleteEvent = String(eventRow.id); deleteButton.textContent = 'Excluir evento'; footer.appendChild(deleteButton); }
    }
    modal.dataset.googleEnhancedProtocol = protocol;
  } finally { delete modal.dataset.googleEnhancingProtocol; }
}

async function connect() { const button = document.querySelector<HTMLButtonElement>('[data-google-calendar-connect],[data-google-calendar-reconnect]'); if (button) { button.disabled = true; button.textContent = 'Abrindo Google...'; } try { const data = await runGoogleCalendarOperation({ action: 'authorize', companyId: null }); if (!data?.url) throw new Error('URL de autorização não recebida'); window.location.assign(data.url); } catch (error) { alert(`Não foi possível iniciar a autorização do Google.\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`); if (button) { button.disabled = false; button.textContent = 'Conectar Google Calendar'; } } }
async function disconnect() { if (!confirm('Desconectar este Google Calendar do CALI Workspace? Os eventos já criados no Google não serão apagados automaticamente.')) return; try { await runGoogleCalendarOperation({ action: 'disconnect', companyId: null }); connectionCache = null; connectionCacheAt = 0; lastRenderKey = ''; document.querySelector<HTMLElement>('.google-calendar-runtime-actions')?.removeAttribute('data-google-connection-ready'); await renderConnection(); } catch (error) { alert(`Não foi possível desconectar.\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`); } }
/* Confirmação de exclusão no padrão dos diálogos do Workspace (antes eram duas janelas nativas do navegador). */
function askDeleteReason(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ap-pd-overlay calendar-delete-confirm-v2';
    overlay.innerHTML = '<section class="ap-status-confirm" role="alertdialog" aria-modal="true" aria-label="Excluir evento"><div><small>AGENDA · EXCLUIR EVENTO</small><h2>Excluir este evento?</h2><p>O evento será removido do Workspace e do Google Agenda. Os convidados recebem a atualização do Google quando aplicável.</p><p>Uma cópia completa fica preservada na auditoria.</p></div><label>Motivo da exclusão<textarea placeholder="Registre o motivo"></textarea></label><footer><button type="button" data-cancel>Voltar</button><button type="button" data-confirm disabled>Excluir definitivamente</button></footer></section>';
    const field = overlay.querySelector('textarea') as HTMLTextAreaElement;
    const confirmButton = overlay.querySelector('[data-confirm]') as HTMLButtonElement;
    const finish = (value: string | null) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(value); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); finish(null); } };
    field.addEventListener('input', () => { confirmButton.disabled = field.value.trim().length < 3; });
    overlay.querySelector('[data-cancel]')?.addEventListener('click', () => finish(null));
    confirmButton.addEventListener('click', () => finish(field.value.trim()));
    overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) finish(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    field.focus();
  });
}
async function deleteEvent(eventId: string) { const reason = await askDeleteReason(); if (!reason) return; try { await runGoogleCalendarOperation({ action: 'delete_event', eventId, reason: reason.trim() }); window.location.reload(); } catch (error) { alert(`Não foi possível excluir o evento.\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`); } }

function scheduleEnhance(delay = 80) { if (!isWorkspaceRoute('/admin/calendario', '/cliente/cronograma')) return; if (enhanceTimer) window.clearTimeout(enhanceTimer); enhanceTimer = window.setTimeout(() => { if (!isCalendar() || !isWorkspaceRoute('/admin/calendario', '/cliente/cronograma')) { uninstallRealtime(); return; } ensureStyle(); void renderConnection(); void enhanceOpenEventModal(); installRealtime(); }, delay); }
function addedRelevantNode(node: Node) { if (!(node instanceof Element)) return false; return node.matches('.calendar-workspace-strip,.calendar-event-modal,.calendar-detail-modal') || Boolean(node.querySelector('.calendar-workspace-strip,.calendar-event-modal,.calendar-detail-modal')); }
function installRealtime() {
  if (!isSupabaseConfigured || unsubscribeRealtime || !isCalendar()) return;
  unsubscribeRealtime = observeCalendarEventSync(async (row) => {
    if (!row.id) return;
    try {
      if (row.cancelled_at && row.sync_status !== 'cancelled_google') await runGoogleCalendarOperation({ action: 'cancel_event', eventId: row.id });
      else if (!row.cancelled_at && ['pending', 'error'].includes(String(row.sync_status || ''))) await runGoogleCalendarOperation({ action: 'sync_event', eventId: row.id });
      const modal = document.querySelector<HTMLElement>('.calendar-detail-modal'); if (modal) { delete modal.dataset.googleEnhancedProtocol; scheduleEnhance(100); }
    } catch (error) { console.error('Falha ao sincronizar evento com Google Calendar', error); }
  });
}
function uninstallRealtime() {
  unsubscribeRealtime?.();
  unsubscribeRealtime = null;
}

export function installGoogleCalendarRuntime() {
  if (installed) return; installed = true; ensureStyle();
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-google-calendar-connect],[data-google-calendar-reconnect]')) { event.preventDefault(); void connect(); return; }
    if (target?.closest('[data-google-calendar-disconnect]')) { event.preventDefault(); void disconnect(); return; }
    const deleteButton = target?.closest<HTMLElement>('[data-google-delete-event]'); if (deleteButton) { event.preventDefault(); event.stopPropagation(); void deleteEvent(String(deleteButton.dataset.googleDeleteEvent || '')); return; }
    const exact = target?.closest<HTMLButtonElement>('[data-google-calendar-exact-url]'); if (exact?.dataset.googleCalendarExactUrl) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); window.open(exact.dataset.googleCalendarExactUrl, '_blank', 'noopener,noreferrer'); return; }
    window.setTimeout(() => { if (window.location.pathname !== lastPath) { lastPath = window.location.pathname; scheduleEnhance(50); } }, 0);
  }, true);
  observer = new MutationObserver((mutations) => {
    const pathChanged = window.location.pathname !== lastPath;
    if (pathChanged) { lastPath = window.location.pathname; scheduleEnhance(40); return; }
    if (!isCalendar()) return;
    if (mutations.some((mutation) => Array.from(mutation.addedNodes).some(addedRelevantNode))) scheduleEnhance(60);
  });
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', () => { lastPath = window.location.pathname; scheduleEnhance(40); });
  scheduleEnhance(120);
}
