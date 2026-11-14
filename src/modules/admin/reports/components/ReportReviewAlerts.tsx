import { CheckCircle2 } from 'lucide-react';
import type { DismissedReportAlert, ReportCloseAlert } from '../../../../lib/reportCloseMetrics';
import { ReportReviewSection } from './ReportReviewSection';
import { ReportSectionHeading } from './ReportSectionHeading';

function ReportAlertActions({ alert, onDismiss, onRestore, locked }: {
  alert: ReportCloseAlert;
  onDismiss?: () => void;
  onRestore?: () => void;
  locked: boolean;
}) {
  const buttonClass = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:rounded-[0.54rem] tw:border tw:border-solid tw:border-[#dec9c3] tw:bg-white tw:px-[0.92rem] tw:py-[0.62rem] tw:text-[0.77rem] tw:font-bold tw:text-cali-brand tw:no-underline tw:disabled:cursor-not-allowed tw:disabled:opacity-45';

  return (
    <div className="tw:flex tw:flex-none tw:items-center tw:gap-[0.62rem]">
      {alert.actionHref && <a className={buttonClass} href={alert.actionHref}>{alert.actionLabel || 'Ver origem'}</a>}
      {onRestore && <button className={buttonClass} type="button" disabled={locked} onClick={onRestore}>Restaurar</button>}
      {onDismiss && <button className={buttonClass} type="button" disabled={locked} onClick={onDismiss}>Ignorar com justificativa</button>}
    </div>
  );
}

function ReportAlertCard({ alert, dismissal, onDismiss, onRestore, locked, editable }: {
  alert: ReportCloseAlert;
  dismissal?: DismissedReportAlert;
  onDismiss?: (alert: ReportCloseAlert) => void;
  onRestore?: (id: string) => void;
  locked: boolean;
  editable: boolean;
}) {
  const critical = alert.blocking || alert.severity === 'critical';
  const tone = !editable
    ? { card: 'tw:border-[#efe7df] tw:bg-[#fffdfb]', label: 'tw:bg-[#fff2dc] tw:text-[#97672f]' }
    : dismissal
      ? { card: 'tone-dismissed tw:border-[#efe7df] tw:border-l-4 tw:border-l-[#d9cdc4] tw:bg-[#faf7f4]', label: 'tw:bg-[#efe7df] tw:text-[#857870]' }
      : critical
        ? { card: 'tone-critical tw:border-[#ecd0d5] tw:border-l-4 tw:border-l-[#b7495d] tw:bg-[#fdf1f2]', label: 'tw:bg-[#f6d5da] tw:text-[#9c2f43]' }
        : { card: 'tone-attention tw:border-[#ecd9b0] tw:border-l-4 tw:border-l-[#d2a851] tw:bg-[#fff8ea]', label: 'tw:bg-[#f6e3b8] tw:text-[#7d5a1c]' };

  return (
    <article className={`tw:flex tw:items-center tw:justify-between tw:gap-[1.54rem] tw:rounded-[0.77rem] tw:border tw:border-solid tw:px-[1.38rem] tw:py-[1.08rem] ${tone.card}`}>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:items-start tw:gap-[1.23rem]">
        <strong className={`tw:flex-none tw:rounded-[0.38rem] tw:px-[0.62rem] tw:py-[0.31rem] tw:text-[0.69rem] tw:font-bold tw:tracking-[0.06em] tw:uppercase ${tone.label}`}>
          {dismissal ? 'Ignorado' : alert.blocking ? 'Precisa corrigir' : 'Atenção'}
        </strong>
        <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.31rem]">
          <b className="tw:block tw:text-[0.92rem] tw:text-[#322f2c] tw:workspace-night:text-[#f0e8e5]">{alert.title}</b>
          <p className="tw:m-0 tw:max-w-[63.08rem] tw:text-[0.85rem] tw:leading-normal tw:text-[#857870] tw:workspace-night:text-[#b5a7a2]">{alert.detail}</p>
          {dismissal && <small className="tw:mt-[0.38rem] tw:block tw:text-[0.77rem] tw:text-[#a18e80] tw:italic">Ignorado: {dismissal.reason}</small>}
        </span>
      </div>
      <ReportAlertActions
        alert={alert}
        locked={locked}
        onDismiss={!dismissal && onDismiss ? () => onDismiss(alert) : undefined}
        onRestore={dismissal && onRestore ? () => onRestore(alert.id) : undefined}
      />
    </article>
  );
}

export function ReportReviewAlerts({ alerts, dismissedAlerts = [], locked = false, onDismiss, onRestore }: {
  alerts: ReportCloseAlert[];
  dismissedAlerts?: DismissedReportAlert[];
  locked?: boolean;
  onDismiss?: (alert: ReportCloseAlert) => void;
  onRestore?: (id: string) => void;
}) {
  return (
    <ReportReviewSection surface="alert">
      <ReportSectionHeading
        number="05"
        title="Conferência antes da aprovação"
        description={alerts.length ? `${alerts.length} ponto(s) merecem conferência antes de fechar.` : 'Nenhuma pendência aberta.'}
        alert
      />
      {alerts.length ? (
        <div className="reports-v16-alert-list tw:flex tw:flex-col tw:gap-[0.77rem] tw:border-t tw:border-solid tw:border-[#eee7e2] tw:workspace-night:border-[#433339]">
          {alerts.map((alert) => (
            <ReportAlertCard
              key={alert.id}
              alert={alert}
              dismissal={dismissedAlerts.find(({ id }) => id === alert.id)}
              locked={locked}
              editable={Boolean(onDismiss)}
              onDismiss={onDismiss}
              onRestore={onRestore}
            />
          ))}
        </div>
      ) : (
        <div className="reports-v16-ok tw:flex tw:items-center tw:gap-[0.69rem] tw:py-[0.31rem] tw:text-[0.85rem] tw:text-[#3f704c]">
          <CheckCircle2 size={18} />Os fatos estão consistentes para o fechamento.
        </div>
      )}
    </ReportReviewSection>
  );
}
