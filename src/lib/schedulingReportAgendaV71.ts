import { supabase } from './supabase';

type AgendaItemV71 = {
  startsAt?: string | null;
  outcome?: string | null;
  reasonCategory?: string | null;
  note?: string | null;
};

type AgendaComplianceV71 = {
  label?: string | null;
  requiredTotal?: number | null;
  occurredCount?: number | null;
  notOccurredCount?: number | null;
  pendingOutcomeCount?: number | null;
  extraCount?: number | null;
  extraOccurredCount?: number | null;
  remoteOccurredCount?: number | null;
  inPersonOccurredCount?: number | null;
  items?: AgendaItemV71[] | null;
};

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function reasonLabel(value?: string | null) {
  const labels: Record<string, string> = {
    client: 'cliente',
    cali: 'CALI',
    external: 'fator externo',
    health: 'saúde',
    travel_vacation: 'viagem/férias',
    other: 'outro motivo',
  };
  return labels[String(value || '')] || 'motivo registrado';
}

function formatDay(value?: string | null) {
  if (!value) return 'data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'data não informada';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolvedExtraOccurred(a: AgendaComplianceV71) {
  if (a.extraOccurredCount !== undefined && a.extraOccurredCount !== null) return number(a.extraOccurredCount);
  return (a.items || []).filter((item: any) => item?.outcome === 'occurred' && (item?.scheduleClass === 'extra' || item?.billingApplies === true)).length;
}

function resolvedModeOccurred(a: AgendaComplianceV71, mode: 'remote' | 'in_person') {
  const direct = mode === 'remote' ? a.remoteOccurredCount : a.inPersonOccurredCount;
  if (direct !== undefined && direct !== null) return number(direct);
  return (a.items || []).filter((item: any) => item?.outcome === 'occurred' && item?.mode === mode).length;
}

function renderAgenda(section: HTMLElement, a: AgendaComplianceV71) {
  const occurred = number(a.occurredCount);
  const notOccurred = number(a.notOccurredCount);
  const pending = number(a.pendingOutcomeCount);
  const required = number(a.requiredTotal);
  const extraOccurred = resolvedExtraOccurred(a);
  const remoteOccurred = resolvedModeOccurred(a, 'remote');
  const inPersonOccurred = resolvedModeOccurred(a, 'in_person');
  const notItems = (a.items || []).filter((item) => item?.outcome === 'not_occurred');
  const key = JSON.stringify({ required, occurred, notOccurred, pending, extraOccurred, remoteOccurred, inPersonOccurred, notItems });
  if (section.dataset.v71AgendaKey === key) return;

  section.dataset.v71AgendaKey = key;
  section.innerHTML = `<div class="reports-v66-agenda-head"><div><small>AGENDA E ATENDIMENTOS</small><h2>Encontros do período</h2></div><span>${esc(a.label || 'CALI')} · não cumulativo</span></div><div class="reports-v66-agenda-grid"><div><small>Previstos no contrato</small><strong>${required}</strong></div><div><small>Realizados</small><strong>${occurred}</strong></div><div><small>Não realizados</small><strong>${notOccurred}</strong></div><div><small>Adicionais realizados</small><strong>${extraOccurred}</strong></div></div><p class="reports-v66-agenda-note"><b>Formato dos encontros realizados:</b> ${remoteOccurred} online · ${inPersonOccurred} presencial.${notItems.length ? ` <b>Não ocorrência:</b> ${notItems.map((item) => `${formatDay(item.startsAt)} · ${reasonLabel(item.reasonCategory)}${item.note ? ` (${esc(item.note)})` : ''}`).join('; ')}.` : ''}${pending ? ` <b>Pendente de registro:</b> ${pending} encontro(s) passado(s) ainda sem confirmação de resultado.` : ''}</p>`;
}

export async function refreshSchedulingReportAgendaV71() {
  if (!supabase || !window.location.pathname.includes('/relatorios')) return;
  const papers = Array.from(document.querySelectorAll<HTMLElement>('.reports-v16-paper-one'));
  for (const paper of papers) {
    const section = paper.querySelector<HTMLElement>('.reports-v66-agenda');
    if (!section || section.dataset.v71Loading === '1') continue;
    const protocol = String(paper.querySelector('.reports-v19-meta strong')?.textContent || '').trim();
    if (!protocol || protocol === '—') continue;
    section.dataset.v71Loading = '1';
    try {
      const { data, error } = await supabase.from('reports').select('source_snapshot').eq('protocol', protocol).maybeSingle();
      if (error) throw error;
      const agenda = (data?.source_snapshot as any)?.agendaCompliance as AgendaComplianceV71 | undefined;
      if (!agenda) continue;
      renderAgenda(section, agenda);
    } catch (error) {
      console.error('Agenda V71 no relatório', error);
    } finally {
      delete section.dataset.v71Loading;
    }
  }
}
