import STYLE from './scheduling-meeting-context-v70.css?inline';
import { isSupabaseConfigured } from '../../api/access/session';
import { readMeetingByProtocol } from '../../api/calendar/meetings';

let installed = false;
let decorating = false;

type MeetingCondition = {
  extra: boolean;
  label: string;
  detail: string;
};

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

function conciseDetail(extra: boolean) {
  if (!extra) return 'Este encontro faz parte da agenda contratual do período.';
  return 'Se precisar cancelar ou remarcar, informe o motivo. A taxa de 20% pode ser aplicada em caso de ausência ou cancelamento sem aviso.';
}

async function conditionForProtocol(protocol: string): Promise<MeetingCondition | null> {
  if (!isSupabaseConfigured || !protocol) return null;
  const { data: event, error } = await readMeetingByProtocol(protocol);
  if (error || !event || event.event_type !== 'meeting') return null;
  if (event.source_type !== 'scheduling_request' && event.billing_applies === null) return null;

  const extra = Boolean(event.billing_applies);
  return {
    extra,
    label: extra ? 'Lembrete' : 'Agenda contratual',
    detail: conciseDetail(extra),
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

export async function refreshSchedulingMeetingContextV70() {
  if (decorating) return;
  if (location.pathname !== '/cliente/cronograma' && location.pathname !== '/admin/calendario') return;
  decorating = true;
  try {
    if (location.pathname === '/cliente/cronograma') {
      softenClientContractCopy();
      await decorateClientModal();
    }

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
