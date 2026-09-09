import { supabase } from './supabase';

let installed = false;
let decorating = false;

type MeetingCondition = {
  extra: boolean;
  label: string;
  detail: string;
};

const STYLE = `
/* CALI Workspace · contexto comercial da reunião V70 */
.v69-facts[data-v70-condition]::after,
.calendar-detail-facts[data-v70-condition]::after{
  content:attr(data-v70-condition-label) ': ' attr(data-v70-condition-detail);
  grid-column:1 / -1;
  width:100%;
  box-sizing:border-box;
  display:block;
  min-height:0;
  padding:10px 14px;
  border:1px solid var(--theme-line,#e8dfd9);
  border-left:3px solid #B58C52;
  border-radius:12px;
  background:var(--theme-surface-soft,#fffdfa);
  color:var(--theme-text,#2b2b2b);
  font-size:13px;
  line-height:1.45;
  font-weight:650;
}
.v69-facts[data-v70-condition='extra']::after,
.calendar-detail-facts[data-v70-condition='extra']::after{
  border-left-color:#5A1E2D;
  background:color-mix(in srgb,#5A1E2D 5%,var(--theme-surface-soft,#fffdfa));
}
html[data-workspace-theme='night'] .v69-facts[data-v70-condition='extra']::after,
html[data-workspace-theme='night'] .calendar-detail-facts[data-v70-condition='extra']::after{
  background:rgba(90,30,45,.20);
}
`;

function ensureStyle() {
  if (document.getElementById('scheduling-meeting-context-v70-style')) return;
  const el = document.createElement('style');
  el.id = 'scheduling-meeting-context-v70-style';
  el.textContent = STYLE;
  document.head.appendChild(el);
}

function protocolFromClientModal(modal: HTMLElement) {
  const text = modal.querySelector<HTMLElement>('.v69-modal-head p')?.textContent || '';
  return text.match(/CALI-EVT-[0-9-]+/i)?.[0] || '';
}

function protocolFromAdminModal(modal: HTMLElement) {
  const text = modal.querySelector<HTMLElement>('.calendar-protocol-badge')?.textContent || '';
  return text.match(/CALI-EVT-[0-9-]+/i)?.[0] || '';
}

function conciseDetail(extra: boolean, reason?: string | null, notice?: string | null) {
  if (!extra) return 'Este encontro faz parte da agenda contratual do período.';
  const text = `${reason || ''} ${notice || ''}`.toLowerCase();
  if (text.includes('deslocamento')) {
    return 'Visita adicional. Se realizada, será cobrada no próximo mês, com taxa de deslocamento.';
  }
  return 'Encontro adicional. Se realizado, será cobrado no próximo mês.';
}

async function conditionForProtocol(protocol: string): Promise<MeetingCondition | null> {
  if (!supabase || !protocol) return null;
  const { data: event, error } = await supabase
    .from('events')
    .select('id,event_type,source_type,source_entity_id,billing_applies,billing_reason,schedule_class')
    .eq('protocol', protocol)
    .maybeSingle();
  if (error || !event || event.event_type !== 'meeting') return null;
  if (event.source_type !== 'scheduling_request' && event.billing_applies === null) return null;

  const extra = Boolean(event.billing_applies);
  let billingNotice: string | null = null;

  if (event.source_type === 'scheduling_request' && event.source_entity_id) {
    const { data: request } = await supabase
      .from('scheduling_requests')
      .select('billing_notice,billable_extra,meeting_entitlement')
      .eq('id', event.source_entity_id)
      .maybeSingle();
    billingNotice = request?.billing_notice ? String(request.billing_notice).trim() : null;
  }

  return {
    extra,
    label: extra ? 'Lembrete' : 'Agenda contratual',
    detail: conciseDetail(extra, event.billing_reason, billingNotice),
  };
}

function applyCondition(target: HTMLElement, condition: MeetingCondition) {
  const next = condition.extra ? 'extra' : 'included';
  if (
    target.dataset.v70Condition === next
    && target.dataset.v70ConditionLabel === condition.label
    && target.dataset.v70ConditionDetail === condition.detail
  ) return;
  target.dataset.v70Condition = next;
  target.dataset.v70ConditionLabel = condition.label;
  target.dataset.v70ConditionDetail = condition.detail;
}

function softenClientContractCopy() {
  if (location.pathname !== '/cliente/cronograma') return;
  const summary = document.querySelector<HTMLElement>('.scheduling-v66-contract-summary');
  if (!summary) return;
  const intro = summary.firstElementChild as HTMLElement | null;
  if (!intro) return;
  const label = (intro.querySelector('small')?.textContent || '').trim().toLowerCase();
  const title = intro.querySelector<HTMLElement>('strong');
  const note = intro.querySelector<HTMLElement>('p');

  if (label.includes('partner')) {
    const nextTitle = 'A agenda do seu pacote prevê 1 encontro online por mês, alinhado previamente pela CALI.';
    const nextNote = 'Se precisar de outro encontro, envie uma solicitação para análise. Se o encontro do mês não for utilizado, ele não é transferido para o período seguinte.';
    if (title && title.textContent !== nextTitle) title.textContent = nextTitle;
    if (note && note.textContent !== nextNote) note.textContent = nextNote;
    return;
  }

  if (label.includes('full')) {
    const nextTitle = 'A agenda do seu pacote prevê 2 encontros por mês, em ritmo quinzenal.';
    const nextNote = 'Um deles pode ser presencial; se preferir, os dois podem ser online. Se precisar de outro encontro, envie uma solicitação para análise. A disponibilidade do mês não é transferida para o período seguinte.';
    if (title && title.textContent !== nextTitle) title.textContent = nextTitle;
    if (note && note.textContent !== nextNote) note.textContent = nextNote;
  }
}

async function decorateClientModal() {
  const modal = document.querySelector<HTMLElement>('#v69-client-event-modal .v69-modal');
  if (!modal) return;
  const facts = modal.querySelector<HTMLElement>('.v69-facts');
  const protocol = protocolFromClientModal(modal);
  if (!facts || !protocol || facts.dataset.v70ResolvedProtocol === protocol) return;
  facts.dataset.v70ResolvedProtocol = protocol;
  const condition = await conditionForProtocol(protocol);
  if (!condition) {
    delete facts.dataset.v70ResolvedProtocol;
    return;
  }
  applyCondition(facts, condition);
}

async function decorateAdminModal() {
  const modal = document.querySelector<HTMLElement>('.calendar-detail-modal');
  if (!modal) return;
  const facts = modal.querySelector<HTMLElement>('.calendar-detail-facts');
  const protocol = protocolFromAdminModal(modal);
  if (!facts || !protocol || facts.dataset.v70ResolvedProtocol === protocol) return;
  facts.dataset.v70ResolvedProtocol = protocol;
  const condition = await conditionForProtocol(protocol);
  if (!condition) {
    delete facts.dataset.v70ResolvedProtocol;
    return;
  }
  applyCondition(facts, condition);
}

export async function refreshSchedulingMeetingContextV70() {
  if (decorating) return;
  if (location.pathname !== '/cliente/cronograma' && location.pathname !== '/admin/calendario') return;
  decorating = true;
  try {
    if (location.pathname === '/cliente/cronograma') {
      softenClientContractCopy();
      await decorateClientModal();
    }
    if (location.pathname === '/admin/calendario') await decorateAdminModal();
  } finally {
    decorating = false;
  }
}

export function installSchedulingMeetingContextV70() {
  if (installed) return;
  installed = true;
  ensureStyle();
  document.addEventListener('click', () => {
    window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 120);
  }, true);
  window.addEventListener('popstate', () => {
    window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 120);
  });
  window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 360);
}