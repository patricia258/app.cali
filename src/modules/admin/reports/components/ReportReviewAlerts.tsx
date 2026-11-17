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
  const buttonClass = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2.5 tw:text-xs tw:font-bold tw:text-cali-brand tw:no-underline tw:disabled:cursor-not-allowed tw:disabled:opacity-45';

  return (
    <div className="tw:flex tw:flex-none tw:items-center tw:gap-2.5">
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
    ? { card: 'tw:border-cali-line tw:bg-cali-paper', label: 'tw:bg-cali-warning-surface tw:text-cali-warning' }
    : dismissal
      ? { card: 'tone-dismissed tw:border-cali-line tw:border-l-4 tw:border-l-cali-neutral-line tw:bg-cali-surface-soft', label: 'tw:bg-cali-line tw:text-cali-muted' }
      : critical
        ? { card: 'tone-critical tw:border-cali-danger-line tw:border-l-4 tw:border-l-cali-danger tw:bg-cali-red-surface', label: 'tw:bg-cali-red-soft tw:text-cali-red-accent' }
        : { card: 'tone-attention tw:border-cali-warning-line tw:border-l-4 tw:border-l-cali-orange-line tw:bg-cali-gold-surface', label: 'tw:bg-cali-gold-soft tw:text-cali-gold-text' };

  return (
    <article className={`tw:flex tw:items-center tw:justify-between tw:gap-6 tw:rounded-xl tw:border tw:border-solid tw:px-5.5 tw:py-4.5 ${tone.card}`}>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:items-start tw:gap-5">
        <strong className={`tw:flex-none tw:rounded-md tw:px-2.5 tw:py-1 tw:text-cali-label tw:font-bold tw:tracking-[0.06em] tw:uppercase ${tone.label}`}>
          {dismissal ? 'Ignorado' : alert.blocking ? 'Precisa corrigir' : 'Atenção'}
        </strong>
        <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
          <b className="tw:block tw:text-cali-body tw:text-cali-text tw:workspace-night:text-cali-neutral-soft">{alert.title}</b>
          <p className="tw:m-0 tw:max-w-[63.08rem] tw:text-sm tw:leading-normal tw:text-cali-muted tw:workspace-night:text-cali-sand-accent">{alert.detail}</p>
          {dismissal && <small className="tw:mt-1.5 tw:block tw:text-xs tw:text-cali-muted tw:italic">Ignorado: {dismissal.reason}</small>}
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
        <div className="reports-v16-alert-list tw:flex tw:flex-col tw:gap-3 tw:border-t tw:border-solid tw:border-cali-line tw:workspace-night:border-cali-line-strong">
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
        <div className="reports-v16-ok tw:flex tw:items-center tw:gap-3 tw:py-1 tw:text-sm tw:text-cali-green-accent">
          <CheckCircle2 size={18} />Os fatos estão consistentes para o fechamento.
        </div>
      )}
    </ReportReviewSection>
  );
}
