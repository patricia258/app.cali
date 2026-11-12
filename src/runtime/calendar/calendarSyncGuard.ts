import { showMessage } from '../../components/feedback/workspaceDialogs';
import runtimeStyles from './calendar-sync-guard.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import { findCalendarEventForSync, invokeGoogleCalendar, listMyPendingCalendarEvents } from '../../api/calendar/sync';

let installed = false;
let repairing = false;

function isAdminCalendar() {
  return window.location.pathname === '/admin/calendario';
}

function isAdminWorkspace() {
  return window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
}

function toast(message: string, kind: 'success' | 'warning' | 'error' = 'success') {
  const old = document.querySelector('.calendar-sync-toast');
  old?.remove();
  const el = document.createElement('div');
  el.className = `calendar-sync-toast ${kind}`;
  el.textContent = message;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 5200);
}

function calendarFormValues(form: HTMLFormElement) {
  const selects = Array.from(form.querySelectorAll<HTMLSelectElement>('select'));
  const company = selects.find((select) => Array.from(select.options).some((option) => option.value === '' && /somente cali/i.test(option.textContent || '')));
  const visibility = selects.find((select) => Array.from(select.options).some((option) => option.value === 'client') && Array.from(select.options).some((option) => option.value === 'internal'));
  const title = form.querySelector<HTMLInputElement>('.calendar-title-field input')?.value.trim() || '';
  const protocolText = form.querySelector<HTMLElement>('.calendar-modal-protocol')?.textContent || '';
  const protocol = protocolText.match(/CALI-EVT-\d{4}-\d+/i)?.[0] || null;
  return { companyId: company?.value || '', visibility: visibility?.value || 'internal', title, protocol };
}

function calendarTimeValues(form: HTMLFormElement) {
  const allDay = Boolean(form.querySelector<HTMLInputElement>('.calendar-all-day input[type="checkbox"]')?.checked);
  const timeInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="time"]'));
  return {
    allDay,
    startTime: timeInputs[0]?.value || '',
    endTime: timeInputs[1]?.value || '',
  };
}

async function invokeSync(eventId: string, silent = false) {
  if (!isSupabaseConfigured || !eventId) return;
  const { data, error } = await invokeGoogleCalendar({ action: 'sync_event', eventId });
  if (error) {
    if (!silent) toast('O evento foi salvo no Workspace, mas o Google não sincronizou. Abra o evento para tentar novamente.', 'error');
    throw error;
  }
  if (data?.error) {
    if (!silent) toast(`Evento salvo, mas houve erro no Google: ${data.detail || data.error}`, 'error');
    throw new Error(data.detail || data.error);
  }
  if (data?.status === 'synced') {
    if (!silent) toast('Evento salvo e sincronizado com o Google Calendar. Convites enviados aos participantes.', 'success');
    window.dispatchEvent(new CustomEvent('cali:calendar-synced', { detail: { eventId, ...data } }));
    return data;
  }
  if (data?.status === 'no_google_connection') {
    if (!silent) toast('Evento salvo no Workspace, mas nenhuma conta Google organizadora está conectada.', 'warning');
    return data;
  }
  return data;
}

async function findAndSync(protocol: string | null, title: string, attempt = 0) {
  if (!isSupabaseConfigured) return;
  try {
    const row = await findCalendarEventForSync(protocol, title);
    if (!row?.id) {
      if (attempt < 2) window.setTimeout(() => void findAndSync(protocol, title, attempt + 1), 900);
      return;
    }
    if (row.sync_status === 'synced') return;
    await invokeSync(row.id);
  } catch (error) {
    console.error('Falha na sincronização explícita do calendário', error);
  }
}

async function repairPendingEvents() {
  if (!isAdminWorkspace() || !isSupabaseConfigured || repairing) return;
  repairing = true;
  try {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    for (const row of await listMyPendingCalendarEvents(since)) {
      try {
        const result = await invokeSync(String(row.id), true);
        if (result?.status === 'synced') toast('Um evento pendente foi recuperado e sincronizado com o Google Calendar.', 'success');
      } catch (error) {
        console.error('Falha ao recuperar evento pendente', error);
      }
    }
  } finally {
    repairing = false;
  }
}

export function installCalendarSyncGuard() {
  if (installed) return;
  installed = true;

  const style = document.createElement('style');
  style.textContent = runtimeStyles;
  document.head.appendChild(style);

  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement | null;
    if (!form?.matches('.calendar-event-modal') || !isAdminCalendar()) return;

    const times = calendarTimeValues(form);
    if (!times.allDay && times.startTime && times.endTime && times.endTime <= times.startTime) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void showMessage('O horário de término precisa ser posterior ao horário de início.');
      return;
    }

    const values = calendarFormValues(form);
    if (values.visibility === 'client' && !values.companyId) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void showMessage('Para compartilhar um compromisso com o cliente, selecione primeiro qual cliente receberá esse evento.\n\nSe for um compromisso somente seu/CALI, altere a visibilidade para “Somente CALI”.');
      return;
    }
    window.setTimeout(() => void findAndSync(values.protocol, values.title), 1100);
  }, true);

  window.addEventListener('focus', () => void repairPendingEvents());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void repairPendingEvents(); });
  window.setTimeout(() => void repairPendingEvents(), 900);
}

