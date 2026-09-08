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
  content:'Condição · ' attr(data-v70-condition-label) '\A' attr(data-v70-condition-detail);
  white-space:pre-line;
  display:flex;
  align-items:center;
  min-height:58px;
  box-sizing:border-box;
  padding:11px 13px;
  border:1px solid var(--theme-line,#e8dfd9);
  border-left:3px solid #B58C52;
  border-radius:12px;
  background:var(--theme-surface-soft,#fffdfa);
  color:var(--theme-text,#2b2b2b);
  font-size:12px;
  line-height:1.48;
  font-weight:700;
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

function fallbackDetail(extra: boolean, reason?: string | null) {
  if (!extra) return 'Este encontro está contemplado na agenda contratual do período.';
  if (reason?.toLowerCase().includes('deslocamento')) {
    return 'Se confirmado e realizado, será cobrado no mês subsequente, acrescido da taxa de deslocamento aplicável.';
  }
  return 'Este encontro excede a agenda contratual disponível e terá cobrança adicional quando realizado.';
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
  let detail = fallbackDetail(extra, event.billing_reason);

  if (event.source_type === 'scheduling_request' && event.source_entity_id) {
    const { data: request } = await supabase
      .from('scheduling_requests')
      .select('billing_notice,billable_extra,meeting_entitlement')
      .eq('id', event.source_entity_id)
      .maybeSingle();
    if (request?.billing_notice) detail = String(request.billing_notice).trim();
  }

  return {
    extra,
    label: extra ? 'Adicional' : 'Incluso no contrato',
    detail,
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
    if (location.pathname === '/cliente/cronograma') await decorateClientModal();
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
