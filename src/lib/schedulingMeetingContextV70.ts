import { supabase } from './supabase';

let installed = false;
let decorating = false;

const STYLE = `
/* CALI Workspace · contexto comercial da reunião V70 · sem inserção de nós */
.v69-facts[data-v70-condition]::after,
.calendar-detail-facts[data-v70-condition]::after{
  content:'Condição · ' attr(data-v70-condition-label);
  display:flex;
  align-items:center;
  min-height:52px;
  box-sizing:border-box;
  padding:12px 13px;
  border:1px solid var(--theme-line,#e8dfd9);
  border-left:3px solid #B58C52;
  border-radius:12px;
  background:var(--theme-surface-soft,#fffdfa);
  color:var(--theme-text,#2b2b2b);
  font-size:13px;
  line-height:1.35;
  font-weight:800;
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

async function conditionForProtocol(protocol: string) {
  if (!supabase || !protocol) return null;
  const { data, error } = await supabase
    .from('events')
    .select('id,event_type,source_type,billing_applies,schedule_class')
    .eq('protocol', protocol)
    .maybeSingle();
  if (error || !data || data.event_type !== 'meeting') return null;
  if (data.source_type !== 'scheduling_request' && data.billing_applies === null) return null;
  return { extra: Boolean(data.billing_applies) };
}

function applyCondition(target: HTMLElement, extra: boolean) {
  const next = extra ? 'extra' : 'included';
  const label = extra ? 'Adicional' : 'Incluso no contrato';
  if (target.dataset.v70Condition === next && target.dataset.v70ConditionLabel === label) return;
  target.dataset.v70Condition = next;
  target.dataset.v70ConditionLabel = label;
}

async function decorateClientModal() {
  const modal = document.querySelector<HTMLElement>('#v69-client-event-modal .v69-modal');
  if (!modal) return;
  const facts = modal.querySelector<HTMLElement>('.v69-facts');
  const protocol = protocolFromClientModal(modal);
  if (!facts || !protocol || facts.dataset.v70ResolvedProtocol === protocol) return;
  const condition = await conditionForProtocol(protocol);
  if (!condition) return;
  applyCondition(facts, condition.extra);
  facts.dataset.v70ResolvedProtocol = protocol;
}

async function decorateAdminModal() {
  const modal = document.querySelector<HTMLElement>('.calendar-detail-modal');
  if (!modal) return;
  const facts = modal.querySelector<HTMLElement>('.calendar-detail-facts');
  const protocol = protocolFromAdminModal(modal);
  if (!facts || !protocol || facts.dataset.v70ResolvedProtocol === protocol) return;
  const condition = await conditionForProtocol(protocol);
  if (!condition) return;
  applyCondition(facts, condition.extra);
  facts.dataset.v70ResolvedProtocol = protocol;
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
    window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 180);
  }, true);
  window.addEventListener('popstate', () => {
    window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 180);
  });
  window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 520);
}
