import { supabase } from './supabase';

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
};

let installed = false;
let observer: MutationObserver | null = null;
let timer: number | undefined;
let policy: AgendaPolicyV67 | null = null;
let policyLoading = false;

const STYLE = `
/* CALI Workspace · agenda contratual UX V67 */
#scheduling-v65-client-host .scheduling-v65-panel{
  border:1px solid #d9bd69!important;
  border-left:5px solid #5A1E2D!important;
  background:linear-gradient(135deg,#FFF4C9 0%,#F7E3A3 100%)!important;
  box-shadow:0 12px 30px rgba(89,63,25,.09)!important;
}
#scheduling-v65-client-host .scheduling-v65-head{background:transparent!important}
#scheduling-client-form .scheduling-v65-grid>div:empty{display:none!important}
#scheduling-client-form .scheduling-v65-field[data-v67-auto]{min-width:0}
.scheduling-v67-contract-help{grid-column:1/-1;margin-top:0;padding:10px 12px;border-radius:10px;border:1px solid var(--theme-line,#ded5cf);background:var(--theme-surface-soft,#faf7f5);font-size:13px;line-height:1.5;color:var(--theme-muted,#716660)}
.scheduling-v67-contract-help strong{color:var(--theme-text,#2b2b2b)}
#v66-contract-form input[readonly]{background:color-mix(in srgb,var(--theme-surface-soft,#faf7f5) 88%,#B58C52 12%);color:var(--theme-muted,#716660);cursor:default}
html[data-workspace-theme='night'] #scheduling-v65-client-host .scheduling-v65-panel{background:linear-gradient(135deg,#44361F 0%,#322719 100%)!important;border-color:#80662E!important;border-left-color:#D2A650!important}
html[data-workspace-theme='night'] .scheduling-v67-contract-help{background:#2b2024;border-color:#523d44;color:#d9cfc8}
@media(max-width:560px){.scheduling-v67-contract-help{font-size:13px}}
`;

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
  if (!supabase || policyLoading || policy || location.pathname !== '/cliente/cronograma') return;
  policyLoading = true;
  try {
    const { start, end } = monthRange();
    const { data, error } = await supabase.rpc('my_agenda_compliance_v66', { p_period_start: start, p_period_end: end });
    if (error) throw error;
    policy = (data || {}) as AgendaPolicyV67;
  } catch (error) {
    console.error('Agenda V67 · regra do cliente', error);
  } finally {
    policyLoading = false;
    scheduleApply(0);
  }
}

function selectedMode(form: HTMLFormElement) {
  return form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value || 'remote';
}

function fixClientModal() {
  const form = document.querySelector<HTMLFormElement>('#scheduling-client-form');
  if (!form) return;

  form.querySelectorAll<HTMLElement>('.scheduling-v65-grid>div:empty').forEach((el) => { el.style.display = 'none'; });

  const policyBox = form.querySelector<HTMLElement>('#scheduling-client-policy');
  if (!policyBox || !policy) return;
  const mode = selectedMode(form);
  const date1 = (form.elements.namedItem('date1') as HTMLInputElement | null)?.value || '';

  // A regra do pacote já permite orientar o cliente antes da escolha da data.
  // Quando houver data, o V66 assume e calcula a condição exata daquele período.
  if (mode === 'in_person' && !date1) {
    const plan = String(policy.plan || '').toLowerCase();
    const onsite = Number(policy.onsitePerMonth || 0);
    const onlineOnly = String(policy.modePolicy || '') === 'online_only';

    if (plan === 'partner' || onlineOnly || onsite === 0) {
      policyBox.className = 'scheduling-v65-policy billable';
      policyBox.innerHTML = '<strong>Visita presencial fora do seu pacote</strong>O CALI Partner inclui 1 encontro online por mês. Visita presencial não faz parte da agenda contratual deste plano. Se você seguir com o pedido e a CALI confirmar a visita, ela será tratada como atendimento adicional e haverá cobrança conforme a condição comercial informada pela CALI.';
      return;
    }

    if (plan === 'full') {
      policyBox.className = 'scheduling-v65-policy';
      policyBox.innerHTML = '<strong>Visita presencial no CALI Full</strong>O seu plano prevê 2 encontros por mês e até 1 deles pode ser presencial. Escolha a primeira data para o Workspace verificar se a visita ainda está disponível no período ou se será um encontro adicional.';
    }
  }
}

function fixClientCard() {
  const summary = document.querySelector<HTMLElement>('#scheduling-v65-client-host .scheduling-v66-contract-summary');
  if (!summary || !policy) return;
  const intro = summary.firstElementChild as HTMLElement | null;
  const stats = Array.from(summary.querySelectorAll<HTMLElement>('.scheduling-v66-stat'));
  const plan = String(policy.plan || '').toLowerCase();

  if (intro && intro.dataset.v67Copy !== plan) {
    intro.dataset.v67Copy = plan;
    if (plan === 'partner') {
      intro.innerHTML = '<small>CALI PARTNER</small><strong>1 encontro online por mês</strong><p>Sua reunião contratual é organizada previamente pela CALI e não acumula. Se precisar de outro encontro ou de uma visita presencial, envie uma solicitação: o Workspace sinaliza antes do envio quando a condição estiver fora do pacote.</p>';
    } else if (plan === 'full') {
      intro.innerHTML = '<small>CALI FULL</small><strong>2 encontros por mês, em ritmo quinzenal</strong><p>O mês pode ter 1 encontro online + 1 presencial ou 2 encontros online. A visita presencial não utilizada não acumula. Solicitações além dos 2 encontros do mês são tratadas como adicionais.</p>';
    }
  }

  if (stats[0]) {
    const small = stats[0].querySelector('small');
    const span = stats[0].querySelector('span');
    if (small) small.textContent = plan === 'full' ? 'Encontros do mês' : 'Encontro do mês';
    if (span) span.textContent = 'realizados';
  }
  if (stats[1]) {
    const small = stats[1].querySelector('small');
    const span = stats[1].querySelector('span');
    if (small) small.textContent = 'Na agenda';
    if (span) span.textContent = 'encontros futuros';
  }
  if (stats[2]) {
    const small = stats[2].querySelector('small');
    const span = stats[2].querySelector('span');
    if (small) small.textContent = 'Adicionais';
    if (span) span.textContent = 'fora do pacote';
  }
}

function setAutoFields(form: HTMLFormElement) {
  const plan = String((form.elements.namedItem('plan') as HTMLSelectElement | null)?.value || 'custom');
  const automatic = plan === 'partner' || plan === 'full';
  ['sessions', 'cadence', 'onsite'].forEach((name) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | null;
    if (!input) return;
    input.readOnly = automatic;
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
    if (input.getAttribute('name') === 'sessions') span.textContent = 'Encontros contratuais / mês';
    if (input.getAttribute('name') === 'cadence') span.textContent = 'Intervalo de referência (dias)';
    if (input.getAttribute('name') === 'onsite') span.textContent = 'Destes, quantos podem ser presenciais';
  }

  setAutoFields(form);
  if (!form.querySelector('.scheduling-v67-contract-help')) {
    const help = document.createElement('div');
    help.className = 'scheduling-v67-contract-help';
    help.innerHTML = '<strong>Nos pacotes padrão, estes números são automáticos.</strong> CALI Partner: 1 encontro por mês, referência de 30 dias e 0 presencial. CALI Full: 2 encontros por mês, referência de 14 dias e até 1 presencial dentro desses 2 encontros. Edite manualmente apenas em “Personalizado”.';
    const policyBox = form.querySelector('.scheduling-v65-policy');
    policyBox?.insertAdjacentElement('beforebegin', help);
  }
}

function apply() {
  if (location.pathname === '/cliente/cronograma') {
    void loadClientPolicy();
    fixClientModal();
    fixClientCard();
  }
  if (location.pathname === '/admin/calendario') fixAdminContractModal();
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

export function installSchedulingPolicyUXV67() {
  if (installed) return;
  installed = true;
  ensureStyle();
  window.addEventListener('change', handleChange, true);
  observer = new MutationObserver(() => scheduleApply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => { policy = null; scheduleApply(80); });
  window.setTimeout(apply, 120);
}

installSchedulingPolicyUXV67();
