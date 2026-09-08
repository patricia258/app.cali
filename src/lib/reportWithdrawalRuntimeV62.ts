import { supabase } from './supabase';

type WithdrawableReport = {
  id: string;
  protocol?: string | null;
  status: string;
  client_open_count?: number | null;
  client_first_opened_at?: string | null;
  acknowledged_at?: string | null;
  withdrawn_at?: string | null;
};

let observer: MutationObserver | null = null;
let timer = 0;
let loading = false;
let reportIndex = new Map<string, WithdrawableReport>();

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function eligible(report?: WithdrawableReport | null) {
  return Boolean(
    report
    && ['sent', 'published'].includes(report.status)
    && Number(report.client_open_count || 0) === 0
    && !report.client_first_opened_at
    && !report.acknowledged_at
    && !report.withdrawn_at
  );
}

function closeModal(backdrop: HTMLElement) {
  backdrop.remove();
  document.body.classList.remove('workspace-modal-open');
}

function withdrawalModal(report: WithdrawableReport) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop full-screen-modal report-withdraw-v62-backdrop';
  const card = document.createElement('section');
  card.className = 'modal-card report-withdraw-v62-modal';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.innerHTML = `
    <button type="button" class="modal-close report-withdraw-v62-close" aria-label="Fechar">×</button>
    <span class="section-kicker">RETIRAR RELATÓRIO</span>
    <h2>Retirar este fechamento do Workspace?</h2>
    <p>O cliente ainda não abriu este relatório nem registrou ciência. Ao retirar, o documento deixa de aparecer na área do cliente e a competência fica liberada para um novo fechamento.</p>
    <div class="report-withdraw-v62-note"><strong>Importante</strong><span>O e-mail que já foi enviado não pode ser cancelado. A retirada fica registrada no histórico administrativo para rastreabilidade.</span></div>
    <label class="report-withdraw-v62-reason">Motivo da retirada <span>(opcional)</span><textarea rows="3" maxlength="500" placeholder="Ex.: versão de teste / conteúdo revisado antes da nova emissão"></textarea></label>
    <div class="modal-actions"><button type="button" class="secondary report-withdraw-v62-cancel">Cancelar</button><button type="button" class="danger report-withdraw-v62-confirm">Retirar relatório</button></div>
  `;
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  document.body.classList.add('workspace-modal-open');

  const close = () => closeModal(backdrop);
  card.querySelector('.report-withdraw-v62-close')?.addEventListener('click', close);
  card.querySelector('.report-withdraw-v62-cancel')?.addEventListener('click', close);
  backdrop.addEventListener('pointerdown', (event) => { if (event.target === backdrop) close(); });

  card.querySelector('.report-withdraw-v62-confirm')?.addEventListener('click', async () => {
    if (!supabase) return;
    const confirm = card.querySelector('.report-withdraw-v62-confirm') as HTMLButtonElement;
    const reason = clean((card.querySelector('textarea') as HTMLTextAreaElement | null)?.value).slice(0, 500);
    confirm.disabled = true;
    confirm.textContent = 'Retirando…';
    const result = await supabase.rpc('withdraw_unopened_report_v62', { p_report_id: report.id, p_reason: reason || null });
    if (result.error) {
      confirm.disabled = false;
      confirm.textContent = 'Retirar relatório';
      const message = result.error.message.includes('report_already_seen')
        ? 'Este relatório já foi visualizado ou recebeu ciência e, por segurança, não pode mais ser retirado.'
        : result.error.message.includes('report_not_withdrawable')
          ? 'Este relatório não está mais em um estado que permita retirada.'
          : `Não foi possível retirar o relatório: ${result.error.message}`;
      let error = card.querySelector('.report-withdraw-v62-error') as HTMLElement | null;
      if (!error) {
        error = document.createElement('div');
        error.className = 'inline-notice report-withdraw-v62-error';
        card.querySelector('.report-withdraw-v62-note')?.insertAdjacentElement('afterend', error);
      }
      error.textContent = message;
      return;
    }
    close();
    window.location.reload();
  });
}

function addButton(container: Element, report: WithdrawableReport, compact = false) {
  if (container.querySelector(`[data-withdraw-report-id="${report.id}"]`)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'report-withdraw-v62-button compact' : 'secondary report-withdraw-v62-button';
  button.dataset.withdrawReportId = report.id;
  button.title = 'Retirar da área do cliente e liberar uma nova emissão';
  button.textContent = 'Retirar';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    withdrawalModal(report);
  });
  container.appendChild(button);
}

function applyButtons() {
  if (location.pathname !== '/admin/relatorios') return;
  const rows = Array.from(document.querySelectorAll('.reports-v16-history-table>div:not(.head)')) as HTMLElement[];
  rows.forEach((row) => {
    const reportId = row.dataset.reportId || '';
    const report = reportIndex.get(reportId);
    const actions = row.querySelector('.actions');
    if (actions && eligible(report)) addButton(actions, report!, true);
    else actions?.querySelector('.report-withdraw-v62-button')?.remove();
  });

  const activeRow = rows.find((row) => row.classList.contains('active'));
  const activeId = activeRow?.dataset.reportId || '';
  const active = reportIndex.get(activeId);
  const toolbarActions = document.querySelector('.reports-v16-toolbar>div:last-child');
  const existingToolbar = toolbarActions?.querySelector('.report-withdraw-v62-button');
  if (toolbarActions && eligible(active)) addButton(toolbarActions, active!, false);
  else existingToolbar?.remove();
}

async function refreshIndex() {
  if (!supabase || loading || location.pathname !== '/admin/relatorios') return;
  loading = true;
  try {
    const result = await supabase
      .from('reports')
      .select('id,protocol,status,client_open_count,client_first_opened_at,acknowledged_at,withdrawn_at')
      .in('status', ['sent', 'published'])
      .order('period_start', { ascending: false })
      .limit(60);
    if (!result.error) reportIndex = new Map((result.data || []).map((row: any) => [String(row.id), row as WithdrawableReport]));
  } finally {
    loading = false;
    applyButtons();
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    applyButtons();
    void refreshIndex();
  }, 180);
}

export function installReportWithdrawalRuntimeV62() {
  if (typeof window === 'undefined' || observer) return;
  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  schedule();
}
