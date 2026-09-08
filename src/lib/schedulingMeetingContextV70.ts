import { supabase } from './supabase';

let installed = false;
let decorating = false;

const STYLE = `
/* CALI Workspace · contexto comercial da reunião V70 */
.v70-meeting-condition{border-left:3px solid #B58C52!important}
.v70-meeting-condition.is-extra{border-left-color:#5A1E2D!important;background:color-mix(in srgb,#5A1E2D 5%,var(--theme-surface-soft,#fffdfa))!important}
.v70-meeting-condition strong{display:block}
.v70-meeting-condition small{display:block;margin-top:3px;font-size:11px!important;line-height:1.35;color:var(--theme-muted,#756a65)}
html[data-workspace-theme='night'] .v70-meeting-condition.is-extra{background:rgba(90,30,45,.20)!important}
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
  return {
    extra: Boolean(data.billing_applies),
    scheduleClass: String(data.schedule_class || ''),
  };
}

async function decorateClientModal() {
  const modal = document.querySelector<HTMLElement>('#v69-client-event-modal .v69-modal');
  if (!modal || modal.dataset.v70Condition === '1') return;
  const facts = modal.querySelector<HTMLElement>('.v69-facts');
  const protocol = protocolFromClientModal(modal);
  if (!facts || !protocol) return;
  const condition = await conditionForProtocol(protocol);
  if (!condition || modal.dataset.v70Condition === '1') return;
  const card = document.createElement('div');
  card.className = `v69-fact v70-meeting-condition ${condition.extra ? 'is-extra' : ''}`;
  card.innerHTML = `<span>Condição do atendimento</span><strong>${condition.extra ? 'Adicional' : 'Incluso no contrato'}</strong><small>${condition.extra ? 'Este encontro está registrado como atendimento adicional.' : 'Este encontro está registrado dentro da agenda contratada.'}</small>`;
  facts.appendChild(card);
  modal.dataset.v70Condition = '1';
}

async function decorateAdminModal() {
  const modal = document.querySelector<HTMLElement>('.calendar-detail-modal');
  if (!modal || modal.dataset.v70Condition === '1') return;
  const facts = modal.querySelector<HTMLElement>('.calendar-detail-facts');
  const protocol = protocolFromAdminModal(modal);
  if (!facts || !protocol) return;
  const condition = await conditionForProtocol(protocol);
  if (!condition || modal.dataset.v70Condition === '1') return;
  const card = document.createElement('article');
  card.className = `v70-meeting-condition ${condition.extra ? 'is-extra' : ''}`;
  card.innerHTML = `<span>Condição</span><strong>${condition.extra ? 'Adicional' : 'Incluso no contrato'}</strong><small>${condition.extra ? 'Atendimento adicional registrado para esta reunião.' : 'Encontro previsto na agenda contratada.'}</small>`;
  facts.appendChild(card);
  modal.dataset.v70Condition = '1';
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
  document.addEventListener('click', () => window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 180), true);
  window.addEventListener('popstate', () => window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 180));
  window.setTimeout(() => { void refreshSchedulingMeetingContextV70(); }, 520);
}
