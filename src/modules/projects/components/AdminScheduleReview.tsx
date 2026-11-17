import { useState } from 'react';
import { formatProjectDate, scheduleChangeSummary, type WorkspaceProject } from '../../../domain/projects';
import { useProjectScheduleReviewRequests } from '../hooks/useProjectScheduleReviewRequests';
import { ScheduleAdjustmentDecisionDialog } from './ScheduleAdjustmentDecisionDialog';
import { ScheduleReminderDialog } from './ScheduleReminderDialog';

export const scheduleBanner = 'tw:mb-5 tw:flex tw:items-center tw:justify-between tw:gap-5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-5 tw:py-4 tw:text-cali-body tw:text-cali-warning tw:shadow-[0_.4615rem_1.6923rem_rgb(var(--cali-rgb-burgundy-strong)/0.05098)]';
const pendingBanner = 'tw:mb-5 tw:flex tw:items-center tw:justify-between tw:gap-5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-gold/58 tw:bg-[radial-gradient(circle_at_88%_20%,rgb(var(--cali-rgb-neutral-surface)/0.2784),transparent_24%),linear-gradient(135deg,var(--cali-color-gold-soft)_0%,var(--cali-color-gold-line)_58%,var(--cali-color-orange-soft)_100%)] tw:px-5 tw:py-4 tw:shadow-[0_.9231rem_2.3077rem_rgb(var(--cali-rgb-gold-accent)/0.1294)] tw:[html[data-workspace-theme=night]_&]:border-cali-orange-line/45 tw:[html[data-workspace-theme=night]_&]:bg-[radial-gradient(circle_at_88%_20%,rgb(var(--cali-rgb-gold-accent)/0.1412),transparent_24%),linear-gradient(135deg,var(--cali-color-sand-inverse)_0%,var(--cali-color-sand-inverse)_58%,var(--cali-color-burgundy-strong)_100%)] tw:[html[data-workspace-theme=night]_&]:shadow-[0_1.0769rem_2.6154rem_rgb(var(--cali-rgb-shadow)/0.2)]';
const actionClass = 'tw:min-h-12 tw:cursor-pointer tw:whitespace-nowrap tw:rounded-lg tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-4 tw:py-3 tw:text-sm tw:font-bold tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-50';
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function formatDateTime(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateTime.format(date).replace('.', '') : '—';
}

type Props = {
  project: WorkspaceProject;
  onChanged: () => Promise<void>;
  onNotice: (message: string) => void;
};

export function AdminScheduleReview({ project, onChanged, onNotice }: Props) {
  const reviews = useProjectScheduleReviewRequests(project.id);
  const [dialog, setDialog] = useState<'reminder' | 'accept' | 'reject' | null>(null);
  const current = reviews.data?.find(({ status }) => status === 'pending' || status === 'adjustment_requested');
  const change = current?.requested_changes ?? {};
  const startDate = project.startDate || project.roadmapStartDate;
  const used = Math.min(2, Math.max(0, (current?.request_number ?? 1) - (current?.status === 'adjustment_requested' ? 0 : 1)));
  const close = () => setDialog(null);
  const isAwaiting = project.planningStatus === 'client_review';

  return <>
    {isAwaiting ? <section className={`${pendingBanner} tw:relative tw:overflow-hidden tw:[@media(max-width:950px)]:flex-col tw:[@media(max-width:950px)]:items-start tw:[@media(max-width:950px)]:flex-wrap`}>
      <div aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-0 tw:left-0 tw:h-1 tw:w-full tw:bg-[linear-gradient(90deg,var(--cali-color-burgundy-accent)_0%,var(--cali-color-gold-accent)_48%,rgb(var(--cali-rgb-gold-accent)/0.2)_100%)]" />
      <div aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:-top-21.5 tw:-right-11 tw:size-[16.9231rem] tw:rotate-9 tw:bg-cali-brand tw:opacity-[.055] tw:[mask:url('/brand/cali-oak-mark.svg')_center/contain_no-repeat] tw:[html[data-workspace-theme=night]_&]:bg-cali-day-canvas tw:[html[data-workspace-theme=night]_&]:opacity-[.045]" />
      <div className="tw:relative tw:z-1 tw:grid tw:min-w-0 tw:flex-1 tw:gap-1.5">
        <span className="tw:text-cali-label tw:font-black tw:tracking-[.1em] tw:text-cali-red-strong tw:[html[data-workspace-theme=night]_&]:text-cali-orange-line">AGUARDANDO CLIENTE</span>
        <strong className="tw:text-lg tw:text-cali-burgundy-strong tw:[html[data-workspace-theme=night]_&]:text-cali-orange-surface">Cronograma enviado para aprovação</strong>
        <p className="tw:m-0 tw:mt-1 tw:text-sm tw:leading-[1.45] tw:text-cali-neutral-text tw:[html[data-workspace-theme=night]_&]:text-cali-neutral-line">Cronograma enviado para aprovação. A aprovação não altera datas nem inicia a contagem no dia da resposta. Início planejado: {startDate ? formatProjectDate(startDate) : 'A definir'}.</p>
      </div>
      <dl className="tw:relative tw:z-1 tw:m-0 tw:flex tw:min-w-[26.9231rem] tw:items-stretch tw:[@media(max-width:950px)]:w-full tw:[@media(max-width:950px)]:min-w-0 tw:[@media(max-width:620px)]:grid tw:[@media(max-width:620px)]:grid-cols-2 tw:[@media(max-width:620px)]:gap-3">
        {[
          ['Enviado em', formatDateTime(current?.requested_at)],
          ['Resposta prevista até', formatDateTime(current?.response_due_at)],
          ['Ajustes utilizados', `${used}/2`],
        ].map(([label, value]) => <div key={label} className="tw:grid tw:gap-1 tw:border-l tw:border-solid tw:border-cali-brand/17 tw:px-4.5 tw:first:border-l-0 tw:first:pl-0 tw:[@media(max-width:620px)]:border-l-0 tw:[@media(max-width:620px)]:p-0">
          <dt className="tw:text-cali-micro tw:font-black tw:tracking-[.06em] tw:text-cali-gold-text tw:uppercase tw:[html[data-workspace-theme=night]_&]:text-cali-orange-line">{label}</dt>
          <dd className="tw:m-0 tw:text-sm tw:font-bold tw:whitespace-nowrap tw:text-cali-neutral-strong tw:[html[data-workspace-theme=night]_&]:text-cali-orange-surface">{value}</dd>
        </div>)}
      </dl>
      <button type="button" className={`${actionClass} tw:relative tw:z-1 tw:shadow-[0_.4615rem_1.0769rem_rgb(var(--cali-rgb-burgundy-accent)/0.1216)] tw:[@media(max-width:950px)]:ml-auto tw:[@media(max-width:620px)]:ml-0`}
        onClick={() => setDialog('reminder')} disabled={!current}>Lembrar cliente</button>
    </section> : current && <section className={`${scheduleBanner} tw:[@media(max-width:950px)]:flex-col tw:[@media(max-width:950px)]:items-start`}>
      <div className="tw:grid tw:min-w-0 tw:gap-1">
        <span className="tw:text-cali-label tw:font-black tw:tracking-[.1em] tw:text-cali-red-strong">AJUSTE SOLICITADO · {current.request_number}/2</span>
        <strong className="tw:text-base tw:text-cali-text">{change.targetLabel || 'Cronograma'}</strong>
        <p className="tw:m-0 tw:mt-1 tw:text-sm tw:leading-[1.45] tw:text-cali-muted">{current.response_note || 'O cliente solicitou uma alteração no cronograma.'}</p>
        {scheduleChangeSummary(change).map((item) => <span key={item} className="tw:mt-1 tw:text-cali-label tw:text-cali-gold-text">{item}</span>)}
      </div>
      <div className="tw:flex tw:items-center tw:gap-2.5">
        <button type="button" className={actionClass} onClick={() => setDialog('reject')}>Não aplicar</button>
        <button type="button" className={actionClass} onClick={() => setDialog('accept')}>Acolher solicitação</button>
      </div>
    </section>}
    {reviews.isError && <p role="alert" className="tw:text-cali-danger">{reviews.error.message} <button type="button" onClick={() => void reviews.refetch()}>Tentar novamente</button></p>}
    {dialog === 'reminder' && <ScheduleReminderDialog project={project} responseDate={formatDateTime(current?.response_due_at)}
      onClose={close} onSent={() => { close(); onNotice('Lembrete enviado ao cliente.'); }} />}
    {(dialog === 'accept' || dialog === 'reject') && current && <ScheduleAdjustmentDecisionDialog
      projectId={project.id} review={current} accept={dialog === 'accept'} onClose={close} onSaved={async () => { await onChanged(); close(); }} />}
  </>;
}
