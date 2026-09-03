import { supabase } from './supabase';

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
  if (!supabase || !eventId) return;
  const { data, error } = await supabase.functions.invoke('google-calendar-oauth', { body: { action: 'sync_event', eventId } });
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
  if (!supabase) return;
  try {
    let row: { id: string; sync_status: string | null } | null = null;
    if (protocol) {
      const result = await supabase.from('events').select('id,sync_status').eq('protocol', protocol).maybeSingle();
      row = result.data as typeof row;
    } else if (title) {
      const { data: userData } = await supabase.auth.getUser();
      let query = supabase.from('events').select('id,sync_status').eq('title', title).order('created_at', { ascending: false }).limit(1);
      if (userData.user?.id) query = query.eq('created_by', userData.user.id);
      const result = await query.maybeSingle();
      row = result.data as typeof row;
    }
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
  if (!isAdminWorkspace() || !supabase || repairing) return;
  repairing = true;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from('events')
      .select('id,sync_status,created_at')
      .eq('created_by', userId)
      .in('sync_status', ['pending', 'error'])
      .gte('created_at', since)
      .is('cancelled_at', null)
      .order('created_at', { ascending: false })
      .limit(10);
    for (const row of rows || []) {
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
  style.textContent = `
    .calendar-sync-toast{position:fixed;right:24px;top:92px;z-index:250;max-width:430px;padding:13px 16px;border-radius:14px;background:#fffdf9;border:1px solid #dfd3ca;color:#2b2b2b;box-shadow:0 18px 48px rgba(48,30,35,.18);font-size:12px;font-weight:750;line-height:1.4}
    .calendar-sync-toast.success{border-left:4px solid #4e8a68}.calendar-sync-toast.warning{border-left:4px solid #b58c52}.calendar-sync-toast.error{border-left:4px solid #9c3d4d}
    [data-workspace-theme='night'] .calendar-sync-toast{background:#21191d;border-color:#49373e;color:#f3eeeb}

    .calendar-workspace-strip,
    html[data-workspace-theme='night'] .calendar-workspace-strip{
      background:rgba(255,253,249,.97)!important;
      border:1px solid rgba(181,140,82,.38)!important;
      box-shadow:0 12px 30px rgba(49,31,25,.055)!important;
    }
    .calendar-workspace-strip strong,
    html[data-workspace-theme='night'] .calendar-workspace-strip strong{color:#2b2b2b!important}
    .calendar-workspace-strip p,
    html[data-workspace-theme='night'] .calendar-workspace-strip p{color:#6e6360!important}
    .calendar-workspace-icon,
    html[data-workspace-theme='night'] .calendar-workspace-icon{background:rgba(181,140,82,.12)!important;color:#5a1e2d!important}
    .calendar-workspace-strip .calendar-connection-status,
    html[data-workspace-theme='night'] .calendar-workspace-strip .calendar-connection-status{background:#f4efe9!important;color:#6e6360!important}
    .calendar-workspace-strip .calendar-connection-status.connected,
    html[data-workspace-theme='night'] .calendar-workspace-strip .calendar-connection-status.connected{background:rgba(53,100,72,.09)!important;color:#356448!important}
  `;
  document.head.appendChild(style);

  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement | null;
    if (!form?.matches('.calendar-event-modal') || !isAdminCalendar()) return;

    const times = calendarTimeValues(form);
    if (!times.allDay && times.startTime && times.endTime && times.endTime <= times.startTime) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      alert('O horário de término precisa ser posterior ao horário de início.');
      return;
    }

    const values = calendarFormValues(form);
    if (values.visibility === 'client' && !values.companyId) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      alert('Para compartilhar um compromisso com o cliente, selecione primeiro qual cliente receberá esse evento.\n\nSe for um compromisso somente seu/CALI, altere a visibilidade para “Somente CALI”.');
      return;
    }
    window.setTimeout(() => void findAndSync(values.protocol, values.title), 1100);
  }, true);

  window.addEventListener('focus', () => void repairPendingEvents());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void repairPendingEvents(); });
  window.setTimeout(() => void repairPendingEvents(), 900);
}
