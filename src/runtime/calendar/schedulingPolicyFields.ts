import STYLE from './scheduling-policy-fields.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import { readAgendaCompliance, readRecentSchedulingRequestBilling } from '../../api/calendar/requests';

type AgendaPolicyV67 = {
  plan?: string | null;
  label?: string | null;
  sessionsPerMonth?: number;
  cadenceDays?: number;
  modePolicy?: string;
  onsitePerMonth?: number;
  requiredTotal?: number;
  occurredCount?: number;
  scheduledCount?: number;
  extraCount?: number;
};

type AdminRequestV67 = {
  id: string;
  request_mode?: string | null;
  billable_extra?: boolean | null;
  billing_acknowledged_at?: string | null;
  urgency_level?: string | null;
  urgency_fee_applies?: boolean | null;
};

let installed = false;
let observer: MutationObserver | null = null;
let timer: number | undefined;
let applying = false;
let policy: AgendaPolicyV67 | null = null;
let policyLoading = false;
let adminLoading = false;
let adminLoaded = false;
let adminRequests = new Map<string, AdminRequestV67>();

const OBSERVED_SELECTOR = '#scheduling-v65-client-host,#scheduling-v65-admin-host,#scheduling-client-form,#v66-contract-form';

function ensureStyle() {
  if (document.getElementById('scheduling-policy-ux-v67-style')) return;
  const el = document.createElement('style');
  el.id = 'scheduling-policy-ux-v67-style';
  el.textContent = STYLE;
  document.head.appendChild(el);
}

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const endDate = new Date(y, m + 1, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

async function loadClientPolicy() {
  if (!isSupabaseConfigured || policyLoading || policy || location.pathname !== '/cliente/cronograma') return;
  policyLoading = true;
  try {
    const { start, end } = monthRange();
    const { data, error } = await readAgendaCompliance(start, end);
    if (error) throw error;
    policy = (data || {}) as AgendaPolicyV67;
  } catch (error) {
    console.error('Agenda V67 · regra do cliente', error);
  } finally {
    policyLoading = false;
    scheduleApply(0);
  }
}

async function loadAdminRequests() {
  if (!isSupabaseConfigured || adminLoading || adminLoaded || location.pathname !== '/admin/calendario') return;
  adminLoading = true;
  try {
    const { data, error } = await readRecentSchedulingRequestBilling();
    if (error) throw error;
    adminRequests = new Map(((data || []) as AdminRequestV67[]).map((row) => [row.id, row]));
    adminLoaded = true;
  } catch (error) {
    console.error('Agenda V67 · solicitações admin', error);
  } finally {
    adminLoading = false;
    scheduleApply(0);
  }
}

function selectedMode(form: HTMLFormElement) {
  return form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value || 'remote';
}

function fixClientModal() {
  const form = document.querySelector<HTMLFormElement>('#scheduling-client-form');
  if (!form) return;
  form.querySelectorAll<HTMLElement>('.scheduling-v65-grid>div:empty').forEach((el) => { if (el.style.display !== 'none') el.style.display = 'none'; });

  const policyBox = form.querySelector<HTMLElement>('#scheduling-client-policy');
  if (!policyBox || !policy) return;
  const mode = selectedMode(form);
  const date1 = (form.elements.namedItem('date1') as HTMLInputElement | null)?.value || '';

  if (mode === 'in_person' && !date1) {
    const plan = String(policy.plan || '').toLowerCase();
    const onsite = Number(policy.onsitePerMonth || 0);
    const onlineOnly = String(policy.modePolicy || '') === 'online_only';
    const desired = plan === 'partner' || onlineOnly || onsite === 0
      ? '<strong>Visita presencial fora do seu pacote</strong>O CALI Partner inclui 1 encontro online por mês. Se a CALI confirmar esta visita, ela será tratada como atendimento adicional e haverá cobrança conforme a condição comercial informada.'
      : plan === 'full'
        ? '<strong>Visita presencial no CALI Full</strong>Até 1 dos 2 encontros do mês pode ser presencial. Escolha a primeira data para verificar a disponibilidade no período.'
        : '';
    if (desired && policyBox.innerHTML !== desired) {
      policyBox.className = plan === 'partner' || onlineOnly || onsite === 0 ? 'scheduling-v65-policy billable' : 'scheduling-v65-policy';
      policyBox.innerHTML = desired;
    }
  }
}

function fixClientCard() {
  const host = document.getElementById('scheduling-v65-client-host');
  const summary = host?.querySelector<HTMLElement>('.scheduling-v66-contract-summary');
  if (!summary || !policy) return;

  const plan = String(policy.plan || '').toLowerCase();
  const planLabel = plan === 'partner' ? 'CALI Partner' : plan === 'full' ? 'CALI Full' : String(policy.label || 'Personalizado');
  const required = Number(policy.requiredTotal || policy.sessionsPerMonth || 0);
  const occurred = Number(policy.occurredCount || 0);
  const scheduled = Number(policy.scheduledCount || 0);
  const extras = Number(policy.extraCount || 0);
  const signature = `${planLabel}|${required}|${occurred}|${scheduled}|${extras}`;
  if (summary.dataset.v67Signature === signature) return;
  summary.dataset.v67Signature = signature;

  summary.innerHTML = `
    <div><small>SEU PACOTE</small><strong>${planLabel}</strong></div>
    <div class="scheduling-v66-stat"><small>${required === 1 ? 'Encontro do mês' : 'Encontros do mês'}</small><b>${occurred}/${required}</b><span>realizados</span></div>
    <div class="scheduling-v66-stat"><small>Na agenda</small><b>${scheduled}</b><span>confirmados</span></div>
    <div class="scheduling-v66-stat"><small>Adicionais</small><b>${extras}</b><span>fora do pacote</span></div>`;
}

function setAutoFields(form: HTMLFormElement) {
  const plan = String((form.elements.namedItem('plan') as HTMLSelectElement | null)?.value || 'custom');
  const automatic = plan === 'partner' || plan === 'full';
  ['sessions', 'cadence', 'onsite'].forEach((name) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | null;
    if (!input) return;
    if (input.readOnly !== automatic) input.readOnly = automatic;
    input.dataset.v67Auto = automatic ? '1' : '0';
  });
}

function fixAdminContractModal() {
  const form = document.querySelector<HTMLFormElement>('#v66-contract-form');
  if (!form) return;
  const fields = Array.from(form.querySelectorAll<HTMLLabelElement>('.scheduling-v65-field'));
  for (const field of fields) {
    const input = field.querySelector<HTMLInputElement | HTMLSelectElement>('input,select');
    const span = field.querySelector<HTMLElement>(':scope>span');
    if (!input || !span) continue;
    const name = input.getAttribute('name');
    const desired = name === 'sessions' ? 'Encontros contratuais / mês' : name === 'cadence' ? 'Intervalo de referência (dias)' : name === 'onsite' ? 'Destes, quantos podem ser presenciais' : '';
    if (desired && span.textContent !== desired) span.textContent = desired;
  }

  setAutoFields(form);
  if (!form.querySelector('.scheduling-v67-contract-help')) {
    const help = document.createElement('div');
    help.className = 'scheduling-v67-contract-help';
    help.innerHTML = '<strong>Pacotes padrão usam regras automáticas.</strong> Partner: 1 encontro/mês, 30 dias, online. Full: 2 encontros/mês, 14 dias, até 1 presencial. Edite apenas no plano Personalizado.';
    const policyBox = form.querySelector('.scheduling-v65-policy');
    policyBox?.insertAdjacentElement('beforebegin', help);
  }
}

function simplifyAdminRequestCards() {
  const host = document.getElementById('scheduling-v65-admin-host');
  if (!host || !adminRequests.size) return;

  for (const [id, request] of adminRequests) {
    const card = host.querySelector<HTMLElement>(`[data-admin-request="${CSS.escape(id)}"]`);
    if (!card) continue;

    const top = card.querySelector<HTMLElement>('.scheduling-v65-request-top');
    if (top) {
      const badges = Array.from(top.querySelectorAll<HTMLElement>('.scheduling-v65-badge'));
      if (badges.length > 1) badges.slice(1).forEach((badge) => badge.remove());
    }

    const meta = card.querySelector<HTMLElement>('.scheduling-v66-request-meta');
    if (meta) {
      if (!meta.classList.contains('scheduling-v67-admin-meta')) meta.classList.add('scheduling-v67-admin-meta');
      meta.querySelectorAll<HTMLElement>('.scheduling-v65-badge').forEach((badge) => { if (badge.style.display !== 'none') badge.style.display = 'none'; });
      let format = meta.querySelector<HTMLElement>('.scheduling-v67-admin-format');
      if (!format) {
        format = document.createElement('span');
        format.className = 'scheduling-v67-admin-format';
        meta.prepend(format);
      }
      const desiredFormat = request.request_mode === 'in_person' ? 'Presencial' : 'Online';
      if (format.textContent !== desiredFormat) format.textContent = desiredFormat;
    }

    let note = card.querySelector<HTMLElement>('.scheduling-v67-admin-note');
    const messages: string[] = [];
    if (request.billable_extra) {
      messages.push(request.billing_acknowledged_at
        ? 'Presencial adicional. Cliente ciente da cobrança no mês seguinte + deslocamento.'
        : 'Presencial adicional. Ciência do cliente sobre a cobrança ainda pendente.');
    }
    if (request.urgency_fee_applies) messages.push('Urgência com taxa adicional.');

    if (messages.length) {
      if (!note) {
        note = document.createElement('div');
        note.className = 'scheduling-v67-admin-note';
        const copy = card.querySelector<HTMLElement>('.scheduling-v65-request-copy');
        copy?.appendChild(note);
      }
      const billable = Boolean(request.billable_extra || request.urgency_fee_applies);
      if (note.classList.contains('billable') !== billable) note.classList.toggle('billable', billable);
      const desiredText = messages.join(' ');
      if (note.textContent !== desiredText) note.textContent = desiredText;
    } else if (note) {
      note.remove();
    }

    const optionButtons = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-scheduling-admin-use-slot]'));
    optionButtons.forEach((button, index) => {
      if (button.dataset.v67Ready === '1') return;
      const detail = String(button.textContent || '').replace(/^Confirmar opção\s*·\s*/i, '').trim();
      button.dataset.v67Detail = detail;
      button.dataset.v67Ready = '1';
      button.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = `Confirmar opção ${index + 1}`;
      const small = document.createElement('small');
      small.textContent = detail;
      button.append(strong, small);
    });
  }
}

function watchDom() {
  if (!observer) return;
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function mutationIsRelevant(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (target?.closest(OBSERVED_SELECTOR)) return true;
    for (const node of Array.from(mutation.addedNodes)) {
      if (!(node instanceof Element)) continue;
      if (node.matches(OBSERVED_SELECTOR) || node.querySelector(OBSERVED_SELECTOR)) return true;
    }
  }
  return false;
}

function apply() {
  if (applying) return;
  applying = true;
  observer?.disconnect();
  try {
    if (location.pathname === '/cliente/cronograma') {
      void loadClientPolicy();
      fixClientModal();
      fixClientCard();
    }
    if (location.pathname === '/admin/calendario') {
      void loadAdminRequests();
      fixAdminContractModal();
      simplifyAdminRequestCards();
    }
  } finally {
    window.setTimeout(() => {
      applying = false;
      watchDom();
    }, 0);
  }
}

function scheduleApply(delay = 35) {
  window.clearTimeout(timer);
  timer = window.setTimeout(apply, delay);
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target) return;
  if (target.closest('#scheduling-client-form') && ['mode', 'date1', 'time1', 'urgency'].includes(target.name)) scheduleApply(45);
  if (target.closest('#v66-contract-form') && ['companyId', 'plan'].includes(target.name)) scheduleApply(45);
}

export function installSchedulingPolicyFields() {
  if (installed) return;
  installed = true;
  ensureStyle();
  window.addEventListener('change', handleChange, true);
  observer = new MutationObserver((mutations) => {
    if (!applying && mutationIsRelevant(mutations)) scheduleApply(40);
  });
  watchDom();
  window.addEventListener('popstate', () => {
    policy = null;
    adminLoaded = false;
    adminRequests.clear();
    scheduleApply(80);
  });
  window.setTimeout(apply, 120);
  window.setTimeout(apply, 420);
}

installSchedulingPolicyFields();
