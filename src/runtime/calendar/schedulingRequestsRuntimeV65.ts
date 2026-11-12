import style from './scheduling-requests-runtime-v65.css?inline';
import polishStyle from './scheduling-requests-runtime-v65-polish.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import { observeSchedulingRequests } from '../../api/calendar/agenda';
import {
  readAdminSchedulingRequests, readClientSchedulingCompany, readClientSchedulingRequests,
  readSchedulingRequestDetails, runSchedulingCommand as rpc, signSchedulingAttachment, syncScheduledEvent,
} from '../../api/calendar/requests';
import { isWorkspaceRoute } from '../routeActivity';

type Slot = { startsAt: string; endsAt: string };
type SchedulingRequest = {
  id: string;
  company_id: string;
  requested_by: string;
  request_mode: 'remote' | 'in_person';
  title: string;
  purpose?: string | null;
  location?: string | null;
  requested_slots?: Slot[] | null;
  admin_proposed_slots?: Slot[] | null;
  selected_slot?: Slot | null;
  status: string;
  included_visits_snapshot?: number | null;
  billable_extra?: boolean | null;
  extra_visit?: boolean;
  extra_visit_fee_cents?: number | null;
  extra_visit_ack_name?: string | null;
  extra_visit_cancellation_fee_cents?: number | null;
  extra_visit_cancellation_note?: string | null;
  extra_visit_change_reason?: string | null;
  extra_visit_change_kind?: string | null;
  extra_visit_previous_slot?: Slot | null;
  extra_visit_change_was_confirmed?: boolean | null;
  online_extra_requested?: boolean | null;
  online_extra_quote_cents?: number | null;
  online_extra_quote_accepted_at?: string | null;
  billing_notice?: string | null;
  billing_acknowledged_at?: string | null;
  reschedule_count?: number | null;
  admin_note?: string | null;
  client_note?: string | null;
  confirmed_event_id?: string | null;
  created_at?: string | null;
};
type Company = { id: string; display_name: string; logo_url?: string | null; onsite_visits_included_per_month?: number | null };
type RequestAttachment = { request_id: string; storage_path: string; file_name: string };
let adminRequestIndex = 0;
let adminRequesterNames: Record<string,string> = {};
let adminAttachments: RequestAttachment[] = [];
type ExtraExpense = { request_id: string; expense_kind: string; amount_cents: number; receipt_path: string | null; protocol: string | null; hours_quantity: number | null };

type ClientContext = { company: Company; requests: SchedulingRequest[] };
type AdminContext = { companies: Company[]; requests: SchedulingRequest[] };

let installed = false;
let observer: MutationObserver | null = null;
let realtime: any = null;
let renderTimer: number | undefined;
let clientContext: ClientContext | null = null;
let clientExpenses: ExtraExpense[] = [];
let adminContext: AdminContext | null = null;
let modal: HTMLElement | null = null;
let adminRenderInFlight = false;
let clientRenderInFlight = false;
let adminRefreshPending = false;
let adminDrawerOpen = false;

const ADMIN_PENDING_STATUSES = new Set(['submitted', 'client_review', 'reschedule_review']);
const INCLUDED_USAGE_STATUSES = new Set(['confirmed', 'completed', 'not_occurred', 'reschedule_review']);

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}
function errorText(error: any) { return String(error?.message || error?.details || error || 'Não foi possível concluir a ação.'); }
function slotsOf(value: unknown): Slot[] { return Array.isArray(value) ? value.filter(Boolean) as Slot[] : []; }
function formatSlot(slot?: Slot | null) {
  if (!slot?.startsAt) return 'Horário não definido';
  const start = new Date(slot.startsAt), end = new Date(slot.endsAt || slot.startsAt);
  const day = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(start).replace(/\./g, '');
  const startTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(start);
  const endTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(end);
  return `${day} · ${startTime}–${endTime}`;
}
function monthKey(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7);
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', timeZone: 'America/Sao_Paulo' }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  return year && month ? `${year}-${month}` : '';
}
function statusLabel(status: string) {
  const labels: Record<string, string> = {
    submitted: 'Em análise pela CALI', client_review: 'Sua confirmação', confirmed: 'Confirmado', reschedule_review: 'Reagendamento em análise', completed: 'Realizado', not_occurred: 'Não realizado', declined: 'Recusado', cancelled: 'Cancelado',
  };
  return labels[status] || status;
}
function statusTone(status: string) { return status === 'confirmed' || status === 'completed' ? 'ok' : ['submitted', 'client_review', 'reschedule_review'].includes(status) ? 'pending' : ''; }
function makeSlot(date: string, time: string, duration: number): Slot {
  const start = new Date(`${date}T${time}:00-03:00`);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration * 60_000).toISOString() };
}
function ensureStyle() {
  if (document.getElementById('scheduling-v65-style')) return;
  const node = document.createElement('style'); node.id = 'scheduling-v65-style'; node.textContent = style + polishStyle; document.head.appendChild(node);
}
function closeModal() { modal?.remove(); modal = null; document.body.classList.remove('workspace-modal-open'); }
function ensureAdminFloatHost() {
  if (!document.getElementById('scheduling-v65-admin-float')) {
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'scheduling-v65-admin-float'; button.className = 'scheduling-v65-float';
    button.setAttribute('data-scheduling-admin-float-toggle', ''); button.setAttribute('aria-label', 'Solicitações de agenda'); button.hidden = true;
    button.innerHTML = '<span class="scheduling-v65-float-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span><span class="scheduling-v65-float-label">Solicitações de agenda</span><span class="scheduling-v65-float-badge">0</span>';
    document.body.appendChild(button);
  }
  if (!document.getElementById('scheduling-v65-admin-drawer-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'scheduling-v65-admin-drawer-backdrop'; backdrop.className = 'scheduling-v65-drawer-backdrop'; backdrop.hidden = true;
    document.body.appendChild(backdrop);
  }
  if (!document.getElementById('scheduling-v65-admin-drawer')) {
    const drawer = document.createElement('aside');
    drawer.id = 'scheduling-v65-admin-drawer'; drawer.className = 'scheduling-v65-drawer'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-label', 'Pedidos de agenda');
    drawer.innerHTML = '<div class="scheduling-v65-drawer-head"><div><span class="scheduling-v65-kicker">AGENDA CALI</span><h2>Solicitações</h2></div><button type="button" data-scheduling-admin-drawer-close aria-label="Fechar">×</button></div><div class="scheduling-v65-drawer-body"></div><div class="scheduling-v65-drawer-pager"></div>';
    document.body.appendChild(drawer);
  }
}
function openAdminDrawer() { adminDrawerOpen = true; document.getElementById('scheduling-v65-admin-drawer')?.classList.add('is-open'); const backdrop = document.getElementById('scheduling-v65-admin-drawer-backdrop'); if (backdrop) backdrop.hidden = false; }
function closeAdminDrawer() { adminDrawerOpen = false; document.getElementById('scheduling-v65-admin-drawer')?.classList.remove('is-open'); const backdrop = document.getElementById('scheduling-v65-admin-drawer-backdrop'); if (backdrop) backdrop.hidden = true; }
function toggleAdminDrawer() { if (adminDrawerOpen) closeAdminDrawer(); else openAdminDrawer(); }
function setModalError(message: string) { const node = modal?.querySelector<HTMLElement>('.scheduling-v65-error'); if (node) { node.textContent = message; node.classList.add('show'); } }
function toast(message: string, tone: 'normal' | 'error' = 'normal') { document.querySelector('.scheduling-v65-toast')?.remove(); const node = document.createElement('div'); node.className = `scheduling-v65-toast ${tone === 'error' ? 'error' : ''}`; node.textContent = message; document.body.appendChild(node); window.setTimeout(() => node.remove(), 4200); }
function openModal(title: string, kicker: string, body: string) {
  closeModal();
  modal = document.createElement('div'); modal.className = 'scheduling-v65-modal-backdrop';
  modal.innerHTML = `<div class="scheduling-v65-modal"><div class="scheduling-v65-modal-head"><div><span class="scheduling-v65-kicker">${esc(kicker)}</span><h3>${esc(title)}</h3></div><button type="button" data-scheduling-close aria-label="Fechar">×</button></div>${body}</div>`;
  document.body.appendChild(modal); document.body.classList.add('workspace-modal-open');
}
function usedIncludedVisits(requests: SchedulingRequest[], month: string, excludeId?: string) {
  return requests.filter((request) => request.id !== excludeId && request.request_mode === 'in_person' && !request.billable_extra && INCLUDED_USAGE_STATUSES.has(request.status) && request.selected_slot && monthKey(request.selected_slot.startsAt) === month).length;
}
function likelyBillable(company: Company, requests: SchedulingRequest[], month: string, request?: SchedulingRequest) {
  if (!month) return Number(company.onsite_visits_included_per_month || 0) === 0;
  if (request?.confirmed_event_id && request.billable_extra === false) return false;
  const included = Number(company.onsite_visits_included_per_month || 0);
  return usedIncludedVisits(requests, month, request?.id) >= included;
}

async function renderClient() {
  if (!isSupabaseConfigured || window.location.pathname !== '/cliente/cronograma') return;
  if (clientRenderInFlight) return;
  clientRenderInFlight = true;
  const anchor = document.querySelector<HTMLElement>('.client-google-settings'); if (!anchor) { clientRenderInFlight = false; return; }
  let host = document.getElementById('scheduling-v65-client-host');
  document.querySelectorAll<HTMLElement>('[id="scheduling-v65-client-host"]').forEach((node, index) => { if (index > 0) node.remove(); });
  if (!host) { host = document.createElement('div'); host.id = 'scheduling-v65-client-host'; }
  if (host.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', host);
  host.innerHTML = '';
  let highlightedRequestId = '';
  try {
    const companyId = await readClientSchedulingCompany();
    if (!companyId) throw new Error('Empresa não vinculada ao acesso.');
    const [companyResult, requestResult, expenseResult] = await readClientSchedulingRequests(companyId);
    if (companyResult.error) throw companyResult.error; if (requestResult.error) throw requestResult.error;
    const company = companyResult.data as Company; const requests = (requestResult.data || []) as SchedulingRequest[]; clientContext = { company, requests }; clientExpenses = (expenseResult.data || []) as ExtraExpense[];
    const active = requests.filter((request) => ADMIN_PENDING_STATUSES.has(request.status) || (request.extra_visit && ['confirmed','completed','not_occurred'].includes(request.status)));
    const actionNeeded=active.filter(request=>request.status==='client_review'||(request.online_extra_requested&&request.online_extra_quote_cents&&!request.online_extra_quote_accepted_at));
    const hasNewDates=actionNeeded.some(request=>request.status==='client_review');
    host.innerHTML=actionNeeded.length?`<section class="scheduling-v65-panel compact"><div class="scheduling-v65-head"><div><span class="scheduling-v65-kicker">AGENDA</span><h2>${hasNewDates?'A Paty enviou novas datas':'Orçamento para sua reunião online'}</h2></div></div><div class="scheduling-v65-list">${actionNeeded.map(renderClientRequest).join('')}</div></section>`:'';
    for(const request of actionNeeded.filter(row=>row.online_extra_requested)){const card=host.querySelector<HTMLElement>(`[data-scheduling-request-card="${CSS.escape(request.id)}"]`);const top=card?.querySelector('.scheduling-v65-request-copy');if(!top)continue;const box=document.createElement('div');box.className='scheduling-v65-note';box.innerHTML=request.online_extra_quote_cents?`<strong>Orçamento da reunião extra: R$ ${(request.online_extra_quote_cents/100).toFixed(2).replace('.',',')}</strong><p>${esc(request.billing_notice||'')}</p>${request.online_extra_quote_accepted_at?'<span>Aceito por você.</span>':`<button type="button" class="scheduling-v65-button primary" data-online-extra-accept-quote="${esc(request.id)}">Aceitar orçamento</button>`}`:'<strong>Orçamento em preparo pela CALI. Nenhuma cobrança foi feita.</strong>';top.appendChild(box);}
    const requestedId = new URLSearchParams(window.location.search).get('request');
    highlightedRequestId = requestedId && actionNeeded.some(row => row.id === requestedId) ? requestedId : '';
    if (highlightedRequestId) {
      window.setTimeout(() => {
        const card = [...(host?.querySelectorAll<HTMLElement>('[data-scheduling-request-card]') || [])].find(node => node.dataset.schedulingRequestCard === highlightedRequestId);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (card) { card.tabIndex = -1; card.focus({ preventScroll: true }); }
      }, 100);
    }
  } catch (error) {
    host.innerHTML = `<section class="scheduling-v65-panel"><div class="scheduling-v65-empty">${esc(errorText(error))}</div></section>`;
  } finally { clientRenderInFlight = false; }
}
function proposalNeedsBilling(request: SchedulingRequest, slot: Slot) {
  if (request.extra_visit) return true;
  if (!clientContext || request.request_mode !== 'in_person') return false;
  return likelyBillable(clientContext.company, clientContext.requests, monthKey(slot.startsAt), request);
}
function renderClientRequest(request: SchedulingRequest) {
  const requested = slotsOf(request.requested_slots), proposals = slotsOf(request.admin_proposed_slots), selected = request.selected_slot;
  const proposalBillable = proposals.some((slot) => proposalNeedsBilling(request, slot));
  const receipts = clientExpenses.filter(expense => expense.request_id === request.id);
  return `<article class="scheduling-v65-request" data-scheduling-request-card="${esc(request.id)}"><div class="scheduling-v65-request-copy"><div class="scheduling-v65-request-top"><strong>${esc(request.title)}</strong><span class="scheduling-v65-badge ${statusTone(request.status)}">${esc((request.status === 'client_review' ? 'Aguardando sua escolha' : statusLabel(request.status)))}</span><span class="scheduling-v65-badge">${request.extra_visit ? 'Visita extra · R$ 800,00 / 4h' : request.request_mode === 'in_person' ? 'Presencial' : 'Virtual'}</span></div>${request.purpose ? `<p>${esc(request.purpose)}</p>` : ''}${request.location && request.request_mode === 'in_person' ? `<p><strong>Endereço:</strong> ${esc(request.location)}</p>` : ''}${request.status === 'submitted' || request.status === 'reschedule_review' ? `<div class="scheduling-v65-slots">${requested.map((slot) => `<span class="scheduling-v65-slot">${esc(formatSlot(slot))}</span>`).join('')}</div>` : ''}${request.status === 'client_review' ? `<div class="scheduling-v65-note"><strong>Sua proposta inicial não encaixou.</strong> Escolha uma das novas datas abaixo ou peça outras opções. Vamos encontrar um horário.</div>${request.admin_note ? `<div class="scheduling-v65-note"><strong>Mensagem da Paty:</strong> ${esc(request.admin_note)}</div>` : ''}${proposalBillable && !request.billing_acknowledged_at ? `<label class="scheduling-v65-ack"><input type="checkbox" data-scheduling-accept-ack/> <span>Li e estou ciente das condições da visita adicional.</span></label>` : ''}` : ''}${request.status === 'confirmed' && selected ? `<div class="scheduling-v65-note"><strong>Confirmado:</strong> ${esc(formatSlot(selected))}. O compromisso já faz parte da agenda do Workspace e segue para o Google Calendar da CALI.</div>` : ''}${request.extra_visit && request.status === 'completed' ? `<div class="scheduling-v65-note"><strong>Visita realizada:</strong> R$ 800,00 por até 4h; despesas comprovadas são discriminadas à parte.${receipts.length ? `<div>${receipts.map(expense => `<div class="scheduling-v65-client-expense"><span>${esc(({ transport: 'Deslocamento', parking: 'Estacionamento', food: 'Alimentação', extra_hours: 'Horas adicionais' } as Record<string,string>)[expense.expense_kind] || 'Despesa')} · R$ ${(expense.amount_cents / 100).toFixed(2).replace('.', ',')} ${expense.hours_quantity ? `· ${expense.hours_quantity}h` : ''} · ${esc(expense.protocol || '')}</span>${expense.receipt_path ? `<button type="button" class="scheduling-v65-button" data-extra-receipt="${esc(expense.receipt_path)}">Ver comprovante ↗</button>` : ''}</div>`).join('')}</div>` : ''}</div>` : ''}${request.extra_visit && request.status === 'not_occurred' ? `<div class="scheduling-v65-note"><strong>Visita não realizada:</strong> ${request.extra_visit_cancellation_fee_cents == null ? 'A CALI está avaliando a condição de cancelamento.' : request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 registrada.' : 'Sem taxa de cancelamento.'} ${esc(request.extra_visit_cancellation_note || '')}</div>` : ''}</div><div class="scheduling-v65-actions">${request.status === 'client_review' ? `${proposals.map((slot, index) => `<button type="button" class="scheduling-v65-button primary" data-scheduling-client-accept="${esc(request.id)}" data-slot-index="${index}" data-billable="${proposalNeedsBilling(request, slot) ? '1' : '0'}">Aceitar ${esc(formatSlot(slot))}</button>`).join('')}<button type="button" class="scheduling-v65-button" data-scheduling-client-more="${esc(request.id)}">Pedir outras opções</button>` : request.status === 'submitted' || request.status === 'reschedule_review' ? '<span class="scheduling-v65-badge pending">Aguardando análise</span>' : request.status === 'confirmed' ? '<span class="scheduling-v65-badge ok">Na agenda</span>' : ''}</div></article>`;
}
function openClientForm() {
  if (!clientContext) return;
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  openModal('Solicitar horário', 'AGENDA COM A CALI', `<form class="scheduling-v65-form" id="scheduling-client-form"><div class="scheduling-v65-grid"><div class="scheduling-v65-field full"><span>Formato</span><div class="scheduling-v65-mode"><label><input type="radio" name="mode" value="remote" checked/> Reunião virtual</label><label><input type="radio" name="mode" value="in_person"/> Visita presencial</label></div></div><label class="scheduling-v65-field full"><span>Assunto</span><input name="title" maxlength="160" required placeholder="Ex.: alinhamento de prioridades do mês"/></label><label class="scheduling-v65-field full"><span>Objetivo / contexto</span><textarea name="purpose" placeholder="Conte em poucas linhas o que precisa ser tratado."></textarea></label><label class="scheduling-v65-field full" data-scheduling-location-field hidden><span>Endereço da visita</span><input name="location" placeholder="Rua, número, bairro, cidade"/></label><label class="scheduling-v65-field"><span>Duração prevista</span><select name="duration"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60" selected>1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label><div></div><div class="scheduling-v65-field"><span>Opção 1</span><div class="scheduling-v65-slot-grid"><input type="date" name="date1" min="${minDate}" required/><input type="time" name="time1" required/></div></div><div class="scheduling-v65-field"><span>Opção 2 <small data-scheduling-slot2-label>(opcional no virtual)</small></span><div class="scheduling-v65-slot-grid"><input type="date" name="date2" min="${minDate}"/><input type="time" name="time2"/></div></div></div><div id="scheduling-client-policy" class="scheduling-v65-policy"><strong>Como funciona</strong>As datas enviadas são opções para análise de agenda. Nenhum horário fica reservado até a confirmação final.</div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button primary">Enviar para análise</button></div></form>`);
  const form = modal?.querySelector<HTMLFormElement>('#scheduling-client-form'); if (form) {
    form.dataset.onlineExtra='1';
    form.querySelector<HTMLInputElement>('input[value="in_person"]')?.closest('label')?.remove();
    form.querySelector<HTMLElement>('[data-scheduling-location-field]')?.remove();
    const policy=form.querySelector<HTMLElement>('#scheduling-client-policy');if(policy)policy.innerHTML='<strong>Reunião online adicional</strong>Este pedido não usa o encontro incluído no pacote. A CALI informa o orçamento e as condições para sua aprovação antes de confirmar qualquer horário. Nada é cobrado automaticamente.';
  }
  updateClientFormPolicy();
}
function updateClientFormPolicy() {
  if (!modal || !clientContext) return;
  const form = modal.querySelector<HTMLFormElement>('#scheduling-client-form'); if (!form) return;
  const mode = form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value || 'remote';
  const locationField = form.querySelector<HTMLElement>('[data-scheduling-location-field]'); if (locationField) locationField.hidden = mode !== 'in_person';
  const slot2Label = form.querySelector<HTMLElement>('[data-scheduling-slot2-label]'); if (slot2Label) slot2Label.textContent = mode === 'in_person' ? '(obrigatória)' : '(opcional no virtual)';
  const date2 = form.elements.namedItem('date2') as HTMLInputElement | null, time2 = form.elements.namedItem('time2') as HTMLInputElement | null; if (date2) date2.required = mode === 'in_person'; if (time2) time2.required = mode === 'in_person';
  const policy = form.querySelector<HTMLElement>('#scheduling-client-policy'); if (!policy) return;
  if (mode !== 'in_person') { policy.className = 'scheduling-v65-policy'; policy.innerHTML = '<strong>Reunião online adicional</strong>A CALI informa o orçamento para você aprovar antes da confirmação. A reunião não consome o encontro incluído no pacote.'; return; }
  const date1 = (form.elements.namedItem('date1') as HTMLInputElement | null)?.value || '';
  const month = date1 ? date1.slice(0, 7) : '';
  const billable = likelyBillable(clientContext.company, clientContext.requests, month);
  if (billable) {
    policy.className = 'scheduling-v65-policy billable';
    policy.innerHTML = `<strong>Visita presencial adicional</strong>Esta visita gera cobrança adicional. Se o cliente cancelar depois da confirmação, será aplicada uma taxa não reembolsável de 20% pelo comprometimento da agenda. A taxa de deslocamento já está incluída. A condição considera até 1h30 de visita.<label class="scheduling-v65-ack"><input type="checkbox" name="billingAck"/> <span>Li e estou ciente desta condição para seguir com a solicitação.</span></label>`;
  } else {
    policy.className = 'scheduling-v65-policy';
    policy.innerHTML = '<strong>Visita presencial incluída no contrato</strong>A realização depende da disponibilidade de ambas as agendas. A visita admite até 2 reagendamentos mediante justificativa, não é cumulativa e, em caso de viagem ou férias, pode ser convertida em reunião virtual.';
  }
}

async function renderAdmin() {
  if (!isSupabaseConfigured || window.location.pathname !== '/admin/calendario') return;
  if (adminRenderInFlight) { adminRefreshPending = true; return; }
  adminRenderInFlight = true;
  ensureAdminFloatHost();
  const float = document.getElementById('scheduling-v65-admin-float') as HTMLButtonElement | null;
  const drawerBody = document.querySelector<HTMLElement>('#scheduling-v65-admin-drawer .scheduling-v65-drawer-body');
  const anchor = document.querySelector<HTMLElement>('.calendar-workspace-strip');
  let host: HTMLElement | null = null;
  if (anchor) {
    host = document.getElementById('scheduling-v65-admin-host');
    document.querySelectorAll<HTMLElement>('[id="scheduling-v65-admin-host"]').forEach((node, index) => { if (index > 0) node.remove(); });
    if (!host) { host = document.createElement('div'); host.id = 'scheduling-v65-admin-host'; anchor.insertAdjacentElement('afterend', host); }
  }
  try {
    const [companiesResult, requestResult] = await readAdminSchedulingRequests();
    if (companiesResult.error) throw companiesResult.error; if (requestResult.error) throw requestResult.error;
    const companies = (companiesResult.data || []) as Company[], requests = (requestResult.data || []) as SchedulingRequest[]; adminContext = { companies, requests };
    const active = requests.filter((request) => ADMIN_PENDING_STATUSES.has(request.status));
    if (active.length) {
      const [people, files] = await readSchedulingRequestDetails(
        [...new Set(active.map((request) => request.requested_by))], active.map((request) => request.id),
      );
      adminRequesterNames = Object.fromEntries((people.data || []).map(person => [person.id, person.full_name]));
      adminAttachments = (files.data || []) as RequestAttachment[];
    }
    const pendingCount = requests.filter((request) => request.status === 'submitted' || request.status === 'reschedule_review').length;
    const extraOutcomes = requests.filter(request => request.extra_visit && ['cancelled','reschedule_review','confirmed','completed'].includes(request.status) && request.extra_visit_change_reason);
    if (float) { float.hidden = pendingCount === 0; const badge = float.querySelector('.scheduling-v65-float-badge'); if (badge) badge.textContent = String(pendingCount); }
    if (active.length === 0) closeAdminDrawer();
    if (drawerBody) { adminRequestIndex = Math.min(adminRequestIndex, Math.max(0, active.length - 1)); renderAdminDrawerItems(active); }
    if (host) host.innerHTML = extraOutcomes.length ? `<section class="scheduling-v65-panel"><div class="scheduling-v65-head"><div><span class="scheduling-v65-kicker">ALTERAÇÕES DO CLIENTE</span><h2>Condições para avaliar</h2><p>A justificativa e a antecedência orientam a decisão sobre a taxa.</p></div></div><div class="scheduling-v65-list">${extraOutcomes.map(request => `<article class="scheduling-v65-request"><div><strong>${esc(companyFor(request.company_id)?.display_name || 'Cliente')} · ${esc(request.title)}</strong><p>${request.extra_visit_change_kind === 'cancel' ? 'Cancelamento' : 'Reagendamento'} · ${esc(request.extra_visit_previous_slot ? formatSlot(request.extra_visit_previous_slot as Slot) : 'data anterior não registrada')}</p><p>Cliente: ${esc(request.extra_visit_change_reason)}</p><p>${request.extra_visit_cancellation_fee_cents == null ? 'Taxa aguardando sua decisão.' : request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 registrada.' : 'Sem taxa.'}</p></div><div class="scheduling-v65-actions"><button type="button" class="scheduling-v65-button" data-extra-change-decision="${esc(request.id)}">${request.extra_visit_cancellation_fee_cents == null ? 'Avaliar taxa' : 'Rever decisão'}</button></div></article>`).join('')}</div></section>` : '';
  } catch (error) { if (drawerBody) drawerBody.innerHTML = `<div class="scheduling-v65-empty">${esc(errorText(error))}</div>`; if (host) host.innerHTML = `<section class="scheduling-v65-panel"><div class="scheduling-v65-empty">${esc(errorText(error))}</div></section>`; } finally { adminRenderInFlight = false; if (adminRefreshPending) { adminRefreshPending = false; void renderAdmin(); } }
}
function companyFor(id: string) { return adminContext?.companies.find((company) => company.id === id) || null; }
function renderAdminDrawerItems(active: SchedulingRequest[]) {
  const body = document.querySelector<HTMLElement>('#scheduling-v65-admin-drawer .scheduling-v65-drawer-body');
  const pager = document.querySelector<HTMLElement>('#scheduling-v65-admin-drawer .scheduling-v65-drawer-pager');
  if (!body || !pager) return;
  body.innerHTML = active.length ? renderAdminRequest(active[adminRequestIndex]) : '<div class="scheduling-v65-empty">Nenhum pedido de agenda pendente.</div>';
  pager.innerHTML = active.length > 1 ? `<button type="button" data-scheduling-drawer-page="-1" aria-label="Pedido anterior">←</button><span>${adminRequestIndex + 1} de ${active.length}</span><button type="button" data-scheduling-drawer-page="1" aria-label="Próximo pedido">→</button>` : '';
}
function renderAdminRequest(request: SchedulingRequest) {
  const company = companyFor(request.company_id), requested = slotsOf(request.requested_slots), proposals = slotsOf(request.admin_proposed_slots);
  const logo = company?.logo_url ? `<img src="${esc(company.logo_url)}" alt="Logo de ${esc(company.display_name)}"/>` : '<span>CALI</span>';
  const attachments = adminAttachments.filter(item => item.request_id === request.id);
  return `<article class="scheduling-v65-focus-card" data-admin-request="${esc(request.id)}">
    <div class="scheduling-v65-focus-cover"><div class="scheduling-v65-focus-logo">${logo}</div><span class="scheduling-v65-badge ${statusTone(request.status)}">${esc(statusLabel(request.status))}</span></div>
    <div class="scheduling-v65-focus-content"><small>${esc(company?.display_name || 'Cliente')}</small><h3>${esc(request.title)}</h3>
      <p>Solicitado por <strong>${esc(adminRequesterNames[request.requested_by] || 'Cliente')}</strong></p>
      ${request.extra_visit ? '<div class="scheduling-v65-focus-fee">Visita extra · R$ 800,00 por até 4h · despesas à parte</div>' : ''}
      ${request.online_extra_requested ? `<div class="scheduling-v65-focus-fee">Reunião online extra · ${request.online_extra_quote_cents ? `R$ ${(request.online_extra_quote_cents/100).toFixed(2).replace('.',',')}` : 'orçamento pendente'} · ${request.online_extra_quote_accepted_at ? 'cliente aprovou' : 'aguardando aceite'}</div><button type="button" class="scheduling-v65-button" data-online-extra-quote="${esc(request.id)}">Informar orçamento</button>` : ''}
      ${request.purpose ? `<div class="scheduling-v65-focus-detail"><span>Objetivo</span><p>${esc(request.purpose)}</p></div>` : ''}
      ${request.location ? `<div class="scheduling-v65-focus-detail"><span>Local</span><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.location)}" target="_blank" rel="noopener noreferrer">${esc(request.location)} ↗</a></div>` : ''}
      ${attachments.length ? `<div class="scheduling-v65-focus-detail"><span>Anexo</span>${attachments.map(item => `<button type="button" data-scheduling-request-attachment="${esc(item.storage_path)}">${esc(item.file_name)} ↗</button>`).join('')}</div>` : ''}
      ${request.client_note ? `<div class="scheduling-v65-focus-detail"><span>Mensagem do cliente</span><p>${esc(request.client_note)}</p></div>` : ''}
      ${request.status === 'client_review' ? `<div class="scheduling-v65-focus-detail"><span>Opções enviadas</span><p>${proposals.map(formatSlot).map(esc).join(' · ')}</p></div>` : ''}
      ${request.status === 'submitted' || request.status === 'reschedule_review' ? `<div class="scheduling-v65-focus-options"><span>Escolha uma das datas</span>${requested.map((slot,index) => `<button type="button" class="scheduling-v65-button primary" data-scheduling-admin-use-slot="${esc(request.id)}" data-slot-index="${index}">Confirmar · ${esc(formatSlot(slot))}</button>`).join('')}</div><div class="scheduling-v65-focus-actions"><button type="button" class="scheduling-v65-button" data-scheduling-admin-counter="${esc(request.id)}">Sugerir datas</button><button type="button" class="scheduling-v65-button danger" data-scheduling-admin-decline="${esc(request.id)}">Recusar</button></div>` : '<div class="scheduling-v65-focus-fee">Aguardando resposta do cliente.</div>'}
    </div>
  </article>`;
}
function renderOutcomeActions(request: SchedulingRequest) {
  const start = request.selected_slot?.startsAt ? new Date(request.selected_slot.startsAt).getTime() : 0;
  if (start && start > Date.now()) return '<span class="scheduling-v65-badge ok">Compromisso futuro</span>';
  return `<button type="button" class="scheduling-v65-button" data-scheduling-admin-occurred="${esc(request.id)}">Marcar realizado</button><button type="button" class="scheduling-v65-button danger" data-scheduling-admin-no-show="${esc(request.id)}">Não ocorreu</button>`;
}
function openAdminCounter(request: SchedulingRequest) {
  const duration = Math.max(30, Math.round(((new Date(slotsOf(request.requested_slots)[0]?.endsAt || 0).getTime() - new Date(slotsOf(request.requested_slots)[0]?.startsAt || 0).getTime()) / 60000) || 60));
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  openModal('Sugerir outros horários', 'ANÁLISE DE AGENDA', `<form class="scheduling-v65-form" id="scheduling-admin-counter-form" data-request-id="${esc(request.id)}"><div class="scheduling-v65-grid"><label class="scheduling-v65-field"><span>Duração</span><select name="duration"><option value="30" ${duration === 30 ? 'selected' : ''}>30 minutos</option><option value="45" ${duration === 45 ? 'selected' : ''}>45 minutos</option><option value="60" ${duration === 60 ? 'selected' : ''}>1 hora</option><option value="90" ${duration === 90 ? 'selected' : ''}>1h30</option><option value="120" ${duration === 120 ? 'selected' : ''}>2 horas</option>${request.extra_visit ? '<option value="240" selected>4 horas</option>' : ''}</select></label><div></div><div class="scheduling-v65-field"><span>Opção 1</span><div class="scheduling-v65-slot-grid"><input type="date" name="date1" min="${minDate}" required/><input type="time" name="time1" required/></div></div><div class="scheduling-v65-field"><span>Opção 2 ${request.extra_visit ? '(obrigatória)' : '(opcional)'}</span><div class="scheduling-v65-slot-grid"><input type="date" name="date2" min="${minDate}" ${request.extra_visit ? 'required' : ''}/><input type="time" name="time2" ${request.extra_visit ? 'required' : ''}/></div></div><label class="scheduling-v65-field full"><span>Mensagem para o cliente</span><textarea name="note" placeholder="Ex.: as opções enviadas conflitam com a agenda. Consigo nestes horários."></textarea></label></div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button primary">Enviar opções</button></div></form>`);
}
function openAdminDecline(request: SchedulingRequest) {
  openModal('Recusar solicitação', 'ANÁLISE DE AGENDA', `<form class="scheduling-v65-form" id="scheduling-admin-decline-form" data-request-id="${esc(request.id)}"><label class="scheduling-v65-field"><span>Motivo</span><textarea name="note" required placeholder="Explique de forma objetiva por que esta solicitação será recusada."></textarea></label><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button danger">Registrar resposta</button></div></form>`);
}
function openOutcome(request: SchedulingRequest) {
  const includedFixed = request.request_mode === 'in_person' && !request.billable_extra;
  openModal('Registrar não ocorrência', 'HISTÓRICO DA AGENDA', `<form class="scheduling-v65-form" id="scheduling-admin-outcome-form" data-request-id="${esc(request.id)}" data-event-id="${esc(request.confirmed_event_id || '')}"><div class="scheduling-v65-grid"><label class="scheduling-v65-field"><span>Motivo</span><select name="reason" required><option value="">Selecione</option><option value="client">Cliente</option><option value="cali">CALI</option><option value="external">Fator externo</option><option value="health">Saúde</option><option value="travel_vacation">Viagem / férias</option><option value="other">Outro</option></select></label><label class="scheduling-v65-field"><span>Reposição</span><select name="justified"><option value="true">Com justificativa</option><option value="false">Sem justificativa</option></select></label><label class="scheduling-v65-field full"><span>Justificativa / registro</span><textarea name="note" required placeholder="Registre o que impediu a realização."></textarea></label><label class="scheduling-v65-ack full" data-scheduling-convert-wrap hidden><input type="checkbox" name="convertVirtual"/> <span>Converter a reposição desta visita presencial em reunião virtual.</span></label></div><div class="scheduling-v65-policy"><strong>${includedFixed ? 'Visita fixa incluída' : 'Regra de reposição'}</strong>${includedFixed ? `Com justificativa, a visita pode ser reagendada até 2 vezes. Esta solicitação já utilizou ${Number(request.reschedule_count || 0)} reagendamento(s). Sem justificativa, a visita não é reposta e não acumula para o mês seguinte.` : 'Com justificativa, o compromisso pode voltar para análise de agenda. Sem justificativa, a não ocorrência fica encerrada no histórico.'}</div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Cancelar</button><button type="submit" class="scheduling-v65-button danger">Registrar não ocorrência</button></div></form>`);
}

function requestAdmin(id: string) { return adminContext?.requests.find((request) => request.id === id) || null; }
async function refreshCurrent() { if (window.location.pathname === '/cliente/cronograma') await renderClient(); if (window.location.pathname === '/admin/calendario') await renderAdmin(); }

async function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null; if (!target) return;
  const receipt = target.closest<HTMLElement>('[data-extra-receipt]'); if (receipt && isSupabaseConfigured) {
    event.preventDefault(); const path = receipt.dataset.extraReceipt || '';
    const { data, error } = await signSchedulingAttachment(path);
    if (error || !data?.signedUrl) toast(error?.message || 'Comprovante indisponível.', 'error');
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (target.closest('[data-scheduling-close]')) { event.preventDefault(); closeModal(); return; }
  const acceptQuote=target.closest<HTMLElement>('[data-online-extra-accept-quote]');if(acceptQuote){event.preventDefault();const id=acceptQuote.dataset.onlineExtraAcceptQuote||'';const request=clientContext?.requests.find(row=>row.id===id);if(!request?.online_extra_quote_cents||!window.confirm(`Aceitar o orçamento de R$ ${(request.online_extra_quote_cents/100).toFixed(2).replace('.',',')} para esta reunião online extra?`))return;try{await rpc('client_accept_online_extra_quote_v1',{p_request_id:id});toast('Orçamento aceito. A CALI poderá confirmar o horário.');await renderClient();}catch(error){toast(errorText(error),'error')}return;}
  const quote=target.closest<HTMLElement>('[data-online-extra-quote]');if(quote){event.preventDefault();const id=quote.dataset.onlineExtraQuote||'';
    /* Tabela do papo online (decisão de 14/10): 1 hora R$ 200; 1h30 R$ 300. O valor já vem preenchido pela duração pedida. */
    const asked=adminContext?.requests.find(row=>row.id===id);const askedMinutes=asked?Math.round((new Date(slotsOf(asked.requested_slots)[0]?.endsAt||0).getTime()-new Date(slotsOf(asked.requested_slots)[0]?.startsAt||0).getTime())/60000):0;const tablePrice=askedMinutes>60?300:200;const tableLabel=askedMinutes>60?'1h30':'1 hora';
    openModal('Orçamento da reunião online extra','CONDIÇÕES PARA O CLIENTE',`<form class="scheduling-v65-form" id="online-extra-quote-form" data-request-id="${esc(id)}"><label class="scheduling-v65-field"><span>Valor em reais (tabela: 1 hora R$ 200 · 1h30 R$ 300)</span><input name="amount" type="number" min="1" step="0.01" value="${tablePrice}" required/></label><label class="scheduling-v65-field"><span>Condições e escopo</span><textarea name="note" required minlength="5" placeholder="Explique a duração e o que está incluído.">Papo online de ${tableLabel}, conforme a tabela da CALI.</textarea></label><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Voltar</button><button type="submit" class="scheduling-v65-button primary">Enviar orçamento</button></div></form>`);return;}
  const attachment = target.closest<HTMLElement>('[data-scheduling-request-attachment]'); if (attachment && isSupabaseConfigured) { event.preventDefault(); const { data, error } = await signSchedulingAttachment(attachment.dataset.schedulingRequestAttachment || ''); if (error || !data?.signedUrl) toast(error?.message || 'Anexo indisponível.', 'error'); else window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); return; }
  const page = target.closest<HTMLElement>('[data-scheduling-drawer-page]'); if (page && adminContext) { event.preventDefault(); const active = adminContext.requests.filter(request => ADMIN_PENDING_STATUSES.has(request.status)); if (!active.length) return; adminRequestIndex = (adminRequestIndex + Number(page.dataset.schedulingDrawerPage) + active.length) % active.length; renderAdminDrawerItems(active); return; }
  if (target.closest('[data-scheduling-admin-float-toggle]')) { event.preventDefault(); toggleAdminDrawer(); return; }
  if (target.closest('[data-scheduling-admin-drawer-close]')) { event.preventDefault(); closeAdminDrawer(); return; }
  if (target.id === 'scheduling-v65-admin-drawer-backdrop') { closeAdminDrawer(); return; }
  if (target.closest('[data-scheduling-client-new]')) { event.preventDefault(); window.dispatchEvent(new Event('cali:open-papo-request')); return; }
  const accept = target.closest<HTMLElement>('[data-scheduling-client-accept]');
  if (accept) {
    event.preventDefault(); if (!clientContext) return;
    const id = String(accept.dataset.schedulingClientAccept || ''), index = Number(accept.dataset.slotIndex || 0), card = accept.closest<HTMLElement>('[data-scheduling-request-card]');
    const needsAck = accept.dataset.billable === '1' && !clientContext.requests.find((request) => request.id === id)?.billing_acknowledged_at;
    const ack = Boolean(card?.querySelector<HTMLInputElement>('[data-scheduling-accept-ack]')?.checked);
    if (needsAck && !ack) { toast('Para confirmar esta visita adicional, registre sua ciência sobre a cobrança.', 'error'); return; }
    accept.setAttribute('disabled', 'true');
    try {
      const result = await rpc('client_accept_scheduling_proposal_v1', { p_request_id: id, p_slot_index: index, p_billing_acknowledged: ack });
      if (result?.event_id && isSupabaseConfigured) {
        const sync = await syncScheduledEvent(result.event_id);
        if (sync.error || sync.data?.error) toast('Horário confirmado no Workspace. A sincronização com o Google ficará pendente para nova tentativa.', 'error');
        else toast('Horário confirmado. O compromisso entrou no Workspace e no Google Calendar.');
      }
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) { toast(errorText(error), 'error'); accept.removeAttribute('disabled'); }
    return;
  }
  const more = target.closest<HTMLElement>('[data-scheduling-client-more]'); if (more) { event.preventDefault(); const id = String(more.dataset.schedulingClientMore || ''); if (clientContext?.requests.find(request => request.id === id)?.extra_visit) {
    const minDate = new Date(Date.now() + 48 * 3600000).toISOString().slice(0,10);
    openModal('Outras opções para sua visita', 'VAMOS AJUSTAR A AGENDA', `<form class="scheduling-v65-form" id="extra-visit-client-counter" data-request-id="${esc(id)}"><p>Opa, não encaixou desta vez 🙂 Escolha duas novas opções de 4 horas. Eu avalio e te respondo.</p><div class="scheduling-v65-grid"><div class="scheduling-v65-field"><span>Opção 1</span><div class="scheduling-v65-slot-grid"><input type="date" name="date1" min="${minDate}" required/><input type="time" name="time1" min="09:00" max="12:00" required/></div></div><div class="scheduling-v65-field"><span>Opção 2</span><div class="scheduling-v65-slot-grid"><input type="date" name="date2" min="${minDate}" required/><input type="time" name="time2" min="09:00" max="12:00" required/></div></div><label class="scheduling-v65-field full"><span>Observação</span><textarea name="note" placeholder="Conte o que precisamos considerar."></textarea></label></div><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Voltar</button><button type="submit" class="scheduling-v65-button primary">Enviar opções</button></div></form>`);
    return;
  } const note = window.prompt('Se quiser, diga por que os horários não funcionam ou indique uma preferência.'); if (note === null) return; try { await rpc('client_request_new_scheduling_options_v1', { p_request_id: id, p_note: note }); toast('Pedido enviado. Vamos encontrar uma data juntos.'); await renderClient(); } catch (error) { toast(errorText(error), 'error'); } return; }
  const useSlot = target.closest<HTMLElement>('[data-scheduling-admin-use-slot]'); if (useSlot) { event.preventDefault(); const req = requestAdmin(String(useSlot.dataset.schedulingAdminUseSlot || '')); if (!req) return; if(req.online_extra_requested&&!req.online_extra_quote_accepted_at){toast('Envie o orçamento e aguarde o aceite antes de oferecer a confirmação.','error');return;}const slot = slotsOf(req.requested_slots)[Number(useSlot.dataset.slotIndex || 0)]; if (!slot) return; useSlot.setAttribute('disabled', 'true'); try { if (req.extra_visit) { const result = await rpc('admin_confirm_extra_visit_v1', { p_request_id: req.id, p_slot_index: Number(useSlot.dataset.slotIndex || 0) }); if (result?.event_id && isSupabaseConfigured) void syncScheduledEvent(result.event_id); toast('Visita extra confirmada e cliente notificado.'); } else { await rpc('admin_respond_scheduling_request_v1', { p_request_id: req.id, p_proposed_slots: [slot], p_note: 'Um dos horários enviados está disponível.', p_decline: false }); toast('Horário enviado ao cliente para confirmação.'); } await renderAdmin(); } catch (error) { toast(errorText(error), 'error'); useSlot.removeAttribute('disabled'); } return; }
  const counter = target.closest<HTMLElement>('[data-scheduling-admin-counter]'); if (counter) { event.preventDefault(); const req = requestAdmin(String(counter.dataset.schedulingAdminCounter || '')); if (req) openAdminCounter(req); return; }
  const decline = target.closest<HTMLElement>('[data-scheduling-admin-decline]'); if (decline) { event.preventDefault(); const req = requestAdmin(String(decline.dataset.schedulingAdminDecline || '')); if (req) openAdminDecline(req); return; }
  const occurred = target.closest<HTMLElement>('[data-scheduling-admin-occurred]'); if (occurred) { event.preventDefault(); const req = requestAdmin(String(occurred.dataset.schedulingAdminOccurred || '')); if (!req?.confirmed_event_id || !window.confirm('Confirmar que este compromisso foi realizado?')) return; try { await rpc('admin_mark_scheduling_event_outcome_v1', { p_event_id: req.confirmed_event_id, p_outcome: 'occurred', p_reason_category: null, p_justified: false, p_note: '', p_convert_to_virtual: false }); toast('Compromisso registrado como realizado.'); await renderAdmin(); } catch (error) { toast(errorText(error), 'error'); } return; }
  const noShow = target.closest<HTMLElement>('[data-scheduling-admin-no-show]'); if (noShow) { event.preventDefault(); const req = requestAdmin(String(noShow.dataset.schedulingAdminNoShow || '')); if (req) openOutcome(req); return; }

  const changeDecision = target.closest<HTMLElement>('[data-extra-change-decision]'); if (changeDecision) {
    event.preventDefault(); const id = String(changeDecision.dataset.extraChangeDecision || '');
    const request = requestAdmin(id); if (!request) return;
    openModal('Condição da alteração', 'DECISÃO DA CALI', `<form class="scheduling-v65-form" id="extra-visit-change-decision-form" data-request-id="${esc(id)}"><p>Motivo do cliente: ${esc(request.extra_visit_change_reason || '')}</p><div class="scheduling-v65-mode"><label><input type="radio" name="charge" value="false" checked/> Não cobrar</label>${request.extra_visit_change_was_confirmed ? '<label><input type="radio" name="charge" value="true"/> Cobrar R$ 160,00</label>' : '<p>Pedido alterado antes da confirmação: sem taxa.</p>'}</div><label class="scheduling-v65-field"><span>Motivo da decisão</span><textarea name="note" required minlength="5" placeholder="Registre o aviso, a antecedência e a sua avaliação."></textarea></label><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Voltar</button><button type="submit" class="scheduling-v65-button primary">Enviar decisão</button></div></form>`); return;
  }
  const cancellation = target.closest<HTMLElement>('[data-extra-cancel-id]'); if (cancellation) {
    event.preventDefault(); const id = String(cancellation.dataset.extraCancelId || '');
    openModal('Decisão sobre a visita não realizada', 'AVALIAÇÃO MANUAL', `<form class="scheduling-v65-form" id="extra-visit-cancellation-form" data-request-id="${esc(id)}"><p>Avalie se houve aviso ou uma justificativa. A taxa de 20% corresponde a R$ 160,00.</p><div class="scheduling-v65-mode"><label><input type="radio" name="charge" value="false" checked/> Isentar · com aviso ou justificativa</label><label><input type="radio" name="charge" value="true"/> Cobrar R$ 160,00 · sem aviso nem justificativa</label></div><label class="scheduling-v65-field"><span>Motivo da decisão</span><textarea name="note" required minlength="5" placeholder="Registre o aviso, a justificativa ou a ausência sem aviso."></textarea></label><div class="scheduling-v65-error"></div><div class="scheduling-v65-modal-actions"><button type="button" class="scheduling-v65-button" data-scheduling-close>Voltar</button><button type="submit" class="scheduling-v65-button primary">Registrar decisão</button></div></form>`);
    return;
  }
}

async function handleSubmit(event: SubmitEvent) {
  const form = event.target as HTMLFormElement | null; if (!form) return;
  if(form.id==='online-extra-quote-form'){event.preventDefault();const fd=new FormData(form);try{await rpc('admin_quote_online_extra_v1',{p_request_id:String(form.dataset.requestId||''),p_amount_cents:Math.round(Number(fd.get('amount'))*100),p_note:String(fd.get('note')||'')});closeModal();toast('Orçamento enviado para aceite do cliente.');await renderAdmin();}catch(error){setModalError(errorText(error))}return;}
  if (form.id === 'extra-visit-change-decision-form') {
    event.preventDefault(); const fd = new FormData(form), charge = fd.get('charge') === 'true';
    try { await rpc('admin_decide_extra_visit_change_v2', { p_request_id: String(form.dataset.requestId || ''), p_charge: charge, p_note: String(fd.get('note') || '') }); closeModal(); toast('Decisão registrada e cliente notificado.'); await renderAdmin(); }
    catch (error) { setModalError(errorText(error)); } return;
  }
  if (form.id === 'extra-visit-cancellation-form') {
    event.preventDefault(); const fd = new FormData(form), charge = fd.get('charge') === 'true';
    try { await rpc('admin_set_extra_visit_cancellation_v1', { p_request_id: String(form.dataset.requestId || ''), p_charge: charge, p_note: String(fd.get('note') || '') }); closeModal(); toast(charge ? 'Taxa de R$ 160,00 registrada.' : 'Isenção registrada.'); await renderAdmin(); }
    catch (error) { setModalError(errorText(error)); }
    return;
  }
  if (form.id === 'extra-visit-client-counter') {
    event.preventDefault(); const fd = new FormData(form); const date1 = String(fd.get('date1') || ''), time1 = String(fd.get('time1') || ''), date2 = String(fd.get('date2') || ''), time2 = String(fd.get('time2') || '');
    if (!date1 || !time1 || !date2 || !time2) { setModalError('Informe duas opções completas.'); return; }
    try { await rpc('client_counter_extra_visit_v1', { p_request_id: String(form.dataset.requestId || ''), p_slots: [makeSlot(date1,time1,240),makeSlot(date2,time2,240)], p_note: String(fd.get('note') || '') }); closeModal(); toast('Novas opções enviadas. Vai dar certo 🙂'); await renderClient(); }
    catch (error) { setModalError(errorText(error)); } return;
  }
  if (form.id === 'scheduling-client-form') {
    event.preventDefault(); if (!clientContext) return;
    const fd = new FormData(form), mode = String(fd.get('mode') || 'remote'), duration = Number(fd.get('duration') || 60), date1 = String(fd.get('date1') || ''), time1 = String(fd.get('time1') || ''), date2 = String(fd.get('date2') || ''), time2 = String(fd.get('time2') || '');
    if (!date1 || !time1 || (mode === 'in_person' && (!date2 || !time2))) { setModalError(mode === 'in_person' ? 'Informe duas opções de data e horário para a visita presencial.' : 'Informe ao menos uma opção de data e horário.'); return; }
    const slots = [makeSlot(date1, time1, duration)]; if (date2 && time2) slots.push(makeSlot(date2, time2, duration));
    const ack = Boolean((form.elements.namedItem('billingAck') as HTMLInputElement | null)?.checked);
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]'); if (submit) submit.disabled = true;
    try { if(form.dataset.onlineExtra==='1') await rpc('client_request_online_extra_v1',{p_title:String(fd.get('title')||''),p_purpose:String(fd.get('purpose')||''),p_slots:slots}); else await rpc('create_scheduling_request_v1', { p_mode: mode, p_title: String(fd.get('title') || ''), p_purpose: String(fd.get('purpose') || ''), p_location: String(fd.get('location') || ''), p_requested_slots: slots, p_billing_acknowledged: ack }); closeModal(); toast('Solicitação enviada para análise da CALI.'); await renderClient(); } catch (error) { setModalError(errorText(error)); if (submit) submit.disabled = false; }
    return;
  }
  if (form.id === 'scheduling-admin-counter-form') {
    event.preventDefault(); const fd = new FormData(form), duration = Number(fd.get('duration') || 60), date1 = String(fd.get('date1') || ''), time1 = String(fd.get('time1') || ''), date2 = String(fd.get('date2') || ''), time2 = String(fd.get('time2') || ''); if (!date1 || !time1) { setModalError('Informe ao menos um horário.'); return; }
    const slots = [makeSlot(date1, time1, duration)]; if (date2 && time2) slots.push(makeSlot(date2, time2, duration));
    const counterRequest = requestAdmin(String(form.dataset.requestId || '')); if (counterRequest?.extra_visit && (duration !== 240 || slots.length !== 2)) { setModalError('Envie duas opções de 4 horas para a visita extra.'); return; }
    try { await rpc('admin_respond_scheduling_request_v1', { p_request_id: String(form.dataset.requestId || ''), p_proposed_slots: slots, p_note: String(fd.get('note') || ''), p_decline: false }); closeModal(); toast('Novos horários enviados ao cliente.'); await renderAdmin(); } catch (error) { setModalError(errorText(error)); }
    return;
  }
  if (form.id === 'scheduling-admin-decline-form') {
    event.preventDefault(); const fd = new FormData(form); try { await rpc('admin_respond_scheduling_request_v1', { p_request_id: String(form.dataset.requestId || ''), p_proposed_slots: [], p_note: String(fd.get('note') || ''), p_decline: true }); closeModal(); toast('Resposta registrada.'); await renderAdmin(); } catch (error) { setModalError(errorText(error)); } return;
  }
  if (form.id === 'scheduling-admin-outcome-form') {
    event.preventDefault(); const fd = new FormData(form), reason = String(fd.get('reason') || ''), justified = String(fd.get('justified') || 'false') === 'true', note = String(fd.get('note') || ''), convert = Boolean(fd.get('convertVirtual')); if (!reason || note.trim().length < 3) { setModalError('Selecione o motivo e registre uma justificativa breve.'); return; }
    try { const result = await rpc('admin_mark_scheduling_event_outcome_v1', { p_event_id: String(form.dataset.eventId || ''), p_outcome: 'not_occurred', p_reason_category: reason, p_justified: justified, p_note: note, p_convert_to_virtual: convert }); closeModal(); toast(result?.replacement_allowed ? 'Não ocorrência registrada. A solicitação voltou para análise de agenda.' : 'Não ocorrência registrada no histórico.'); await renderAdmin(); } catch (error) { setModalError(errorText(error)); } return;
  }

}
function handleChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null; if (!target) return;
  if (target.closest('#scheduling-client-form') && ['mode', 'date1'].includes(target.name)) updateClientFormPolicy();

  if (target.closest('#scheduling-admin-outcome-form') && target.name === 'reason') { const wrap = modal?.querySelector<HTMLElement>('[data-scheduling-convert-wrap]'); if (wrap) wrap.hidden = target.value !== 'travel_vacation'; }
}

function ensureHosts() {
  if (window.location.pathname !== '/admin/calendario') { closeAdminDrawer(); document.getElementById('scheduling-v65-admin-float')?.remove(); document.getElementById('scheduling-v65-admin-drawer')?.remove(); document.getElementById('scheduling-v65-admin-drawer-backdrop')?.remove(); }
  if (window.location.pathname === '/cliente/cronograma') { void renderClient(); return; }
  if (window.location.pathname === '/admin/calendario') { void renderAdmin(); return; }
}
function scheduleHosts() { if (!isWorkspaceRoute('/admin/calendario', '/cliente/cronograma') && !document.getElementById('scheduling-v65-admin-float')) return; window.clearTimeout(renderTimer); renderTimer = window.setTimeout(() => { const clientMissing = window.location.pathname === '/cliente/cronograma' && !document.getElementById('scheduling-v65-client-host'); const adminMissing = window.location.pathname === '/admin/calendario' && !document.getElementById('scheduling-v65-admin-host'); if (clientMissing || adminMissing) ensureHosts(); }, 180); }
function installRealtime() {
  if (!isSupabaseConfigured || realtime) return;
  realtime = observeSchedulingRequests('scheduling-requests-v65', () => { void refreshCurrent(); });
}

export function installSchedulingRequestsRuntimeV65() {
  if (installed) return; installed = true; ensureStyle();
  document.addEventListener('click', (event) => void handleClick(event as MouseEvent), true);
  document.addEventListener('submit', (event) => void handleSubmit(event as SubmitEvent), true);
  document.addEventListener('change', handleChange, true);
  observer = new MutationObserver(scheduleHosts); observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => window.setTimeout(ensureHosts, 80));
  installRealtime(); window.setTimeout(ensureHosts, 120);
}
