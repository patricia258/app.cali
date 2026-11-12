import { correctDeliveredReport, readWithdrawableReports, type WithdrawableReport } from '../../api/reports/withdrawal';
import { isWorkspaceRoute } from '../routeActivity';

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
    && !report.withdrawn_at
  );
}

function closeModal(backdrop: HTMLElement) {
  backdrop.remove();
  document.body.classList.remove('workspace-modal-open');
}

function currentProtocol() {
  const values = Array.from(document.querySelectorAll<HTMLElement>('.reports-v16-identification dd'));
  return values.map((item) => clean(item.textContent)).find((value) => /^CALI-RPT-/i.test(value)) || '';
}

function correctionModal(report: WithdrawableReport) {
  const canWithdraw = Number(report.client_open_count || 0) === 0 && !report.client_first_opened_at && !report.acknowledged_at;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop full-screen-modal report-withdraw-v62-backdrop';
  const card = document.createElement('section');
  card.className = 'modal-card report-withdraw-v62-modal';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.innerHTML = `
    <button type="button" class="modal-close report-withdraw-v62-close" aria-label="Fechar">×</button>
    <span class="section-kicker">CORREÇÃO DE RELATÓRIO</span>
    <h2>Corrigir fechamento</h2>
    <p>A versão enviada sai da área do cliente até a próxima liberação. O conteúdo e a ciência anterior ficam no histórico da CALI.</p>
    <div class="report-withdraw-v62-note"><strong>Importante</strong><span>O cliente recebe a nova revisão após aprovação e envio.</span></div>
    <label class="report-withdraw-v62-reason">Motivo<textarea rows="3" maxlength="500"></textarea></label>
    <label><input type="checkbox" class="report-revision-ask-ack" /> Solicitar nova ciência ao cliente</label>
    <div class="modal-actions">
      <button type="button" class="secondary report-withdraw-v62-cancel">Cancelar</button>
      <button type="button" class="danger report-withdraw-v62-remove">Retirar sem substituir</button>
      <button type="button" class="primary report-withdraw-v62-edit">Editar e reenviar</button>
    </div>
  `;
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  document.body.classList.add('workspace-modal-open');

  const close = () => closeModal(backdrop);
  const cancel = card.querySelector('.report-withdraw-v62-cancel') as HTMLButtonElement | null;
  const edit = card.querySelector('.report-withdraw-v62-edit') as HTMLButtonElement | null;
  const remove = card.querySelector('.report-withdraw-v62-remove') as HTMLButtonElement | null;
  if (remove && !canWithdraw) remove.hidden = true;
  card.querySelector('.report-withdraw-v62-close')?.addEventListener('click', close);
  cancel?.addEventListener('click', close);
  backdrop.addEventListener('pointerdown', (event) => { if (event.target === backdrop) close(); });

  function setBusy(busy: boolean) {
    if (cancel) cancel.disabled = busy;
    if (edit) edit.disabled = busy;
    if (remove) remove.disabled = busy;
  }

  function showError(message: string) {
    let error = card.querySelector('.report-withdraw-v62-error') as HTMLElement | null;
    if (!error) {
      error = document.createElement('div');
      error.className = 'inline-notice report-withdraw-v62-error';
      card.querySelector('.report-withdraw-v62-note')?.insertAdjacentElement('afterend', error);
    }
    error.textContent = message;
  }

  async function run(mode: 'edit' | 'remove') {
    const reason = clean((card.querySelector('textarea') as HTMLTextAreaElement | null)?.value).slice(0, 500);
    if (reason.length < 3) { showError('Informe o motivo da correção.'); return; }
    const requestAcknowledgement = Boolean(card.querySelector<HTMLInputElement>('.report-revision-ask-ack')?.checked);
    setBusy(true);
    if (mode === 'edit' && edit) edit.textContent = 'Preparando edição…';
    if (mode === 'remove' && remove) remove.textContent = 'Retirando…';

    const result = await correctDeliveredReport(report.id, reason, mode, requestAcknowledgement);

    if (result.error) {
      setBusy(false);
      if (edit) edit.textContent = 'Editar e reenviar';
      if (remove) remove.textContent = 'Retirar sem substituir';
      const message = result.error.includes('report_already_seen')
        ? 'O cliente já visualizou ou registrou ciência. A partir desse ponto, a versão enviada não pode mais ser retirada.'
        : result.error.includes('report_not_reopenable') || result.error.includes('report_not_withdrawable')
          ? 'Este relatório não está mais em um estado que permita correção antes da leitura.'
          : `Não foi possível concluir a ação: ${result.error}`;
      showError(message);
      return;
    }

    close();
    if (result.revisionId) window.location.assign('/admin/relatorios?report=' + encodeURIComponent(result.revisionId));
    else window.location.reload();
  }

  edit?.addEventListener('click', () => void run('edit'));
  remove?.addEventListener('click', () => void run('remove'));
}

function addButton(container: Element, report: WithdrawableReport, compact = false) {
  if (container.querySelector(`[data-withdraw-report-id="${report.id}"]`)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'report-withdraw-v62-button compact' : 'secondary report-withdraw-v62-button';
  button.dataset.withdrawReportId = report.id;
  button.title = 'Abrir revisão para correção';
  button.textContent = 'Corrigir';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    correctionModal(report);
  });
  container.appendChild(button);
}

function applyButtons() {
  if (location.pathname !== '/admin/relatorios') return;

  const legacyRows = Array.from(document.querySelectorAll('.reports-v16-history-table>div:not(.head)')) as HTMLElement[];
  legacyRows.forEach((row) => {
    const reportId = row.dataset.reportId || '';
    const report = reportIndex.get(reportId);
    const actions = row.querySelector('.actions');
    if (actions && eligible(report)) addButton(actions, report!, true);
    else actions?.querySelector('.report-withdraw-v62-button')?.remove();
  });

  const historyRows = Array.from(document.querySelectorAll<HTMLTableRowElement>('.report-client-history-table-v57 tbody tr:not(.report-history-detail-row-v57)'));
  historyRows.forEach((row) => {
    const expand = row.querySelector<HTMLButtonElement>('[data-history-expand]');
    const reportId = expand?.dataset.historyExpand || '';
    const report = reportIndex.get(reportId);
    const actions = expand?.parentElement;
    if (actions && eligible(report)) addButton(actions, report!, true);
    else actions?.querySelector('.report-withdraw-v62-button')?.remove();
  });

  const protocol = currentProtocol();
  const byProtocol = protocol ? Array.from(reportIndex.values()).find((item) => clean(item.protocol) === protocol) : null;
  const activeRow = legacyRows.find((row) => row.classList.contains('active'));
  const active = byProtocol || reportIndex.get(activeRow?.dataset.reportId || '');
  const toolbarActions = document.querySelector('.reports-v16-toolbar>div:last-child');
  const existingToolbar = toolbarActions?.querySelector('.report-withdraw-v62-button');
  if (toolbarActions && eligible(active)) addButton(toolbarActions, active!, false);
  else existingToolbar?.remove();
}

async function refreshIndex() {
  if (loading || location.pathname !== '/admin/relatorios') return;
  loading = true;
  try {
    const reports = await readWithdrawableReports();
    if (reports && location.pathname === '/admin/relatorios') reportIndex = new Map(reports.map((row) => [row.id, row]));
  } finally {
    loading = false;
    applyButtons();
  }
}

function schedule() {
  if (!isWorkspaceRoute('/admin/relatorios', '/cliente/relatorios')) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    applyButtons();
    void refreshIndex();
  }, 180);
}

export function installReportWithdrawalRuntime() {
  if (typeof window === 'undefined' || observer) return;
  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  schedule();
}
