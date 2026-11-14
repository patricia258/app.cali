import { useState } from 'react';
import { formatProjectDate, scheduleChangeSummary, type WorkspaceProject } from '../../../domain/projects';
import { useProjectScheduleReviewRequests } from '../hooks/useProjectScheduleReviewRequests';
import { ScheduleAdjustmentDecisionDialog } from './ScheduleAdjustmentDecisionDialog';
import { ScheduleReminderDialog } from './ScheduleReminderDialog';

export const scheduleBanner = 'tw:mb-[1.2308rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.2308rem] tw:rounded-[.7692rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.2308rem] tw:py-[1rem] tw:text-[.9231rem] tw:text-[#7a5a2c] tw:shadow-[0_.4615rem_1.6923rem_#2e1d220d]';
const pendingBanner = 'tw:mb-[1.2308rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.2308rem] tw:rounded-[.7692rem] tw:border tw:border-solid tw:border-[#b58c5294] tw:bg-[radial-gradient(circle_at_88%_20%,#ffffff47,transparent_24%),linear-gradient(135deg,#fff1bd_0%,#f8df91_58%,#f3d27d_100%)] tw:px-[1.2308rem] tw:py-[1rem] tw:shadow-[0_.9231rem_2.3077rem_#b58c5221] tw:[html[data-workspace-theme=night]_&]:border-[#d6ae6773] tw:[html[data-workspace-theme=night]_&]:bg-[radial-gradient(circle_at_88%_20%,#b58c5224,transparent_24%),linear-gradient(135deg,#3b2b21_0%,#30241f_58%,#28201c_100%)] tw:[html[data-workspace-theme=night]_&]:shadow-[0_1.0769rem_2.6154rem_#0003]';
const actionClass = 'tw:min-h-[3rem] tw:cursor-pointer tw:whitespace-nowrap tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#dec9c3] tw:bg-white tw:px-[1rem] tw:py-[.6923rem] tw:text-[.8462rem] tw:font-bold tw:text-cali-brand tw:disabled:cursor-not-allowed tw:disabled:opacity-50';
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
      <div aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-0 tw:left-0 tw:h-[.2308rem] tw:w-full tw:bg-[linear-gradient(90deg,#5a1e2d_0%,#b58c52_48%,#b58c5233_100%)]" />
      <div aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-[-5.3846rem] tw:right-[-2.7692rem] tw:size-[16.9231rem] tw:rotate-9 tw:bg-[#5a1e2d] tw:opacity-[.055] tw:[mask:url('/brand/cali-oak-mark.svg')_center/contain_no-repeat] tw:[html[data-workspace-theme=night]_&]:bg-[#f7f3ee] tw:[html[data-workspace-theme=night]_&]:opacity-[.045]" />
      <div className="tw:relative tw:z-1 tw:grid tw:min-w-0 tw:flex-1 tw:gap-[.3846rem]">
        <span className="tw:text-[.6923rem] tw:font-black tw:tracking-[.1em] tw:text-[#6f3243] tw:[html[data-workspace-theme=night]_&]:text-[#e0bd7b]">AGUARDANDO CLIENTE</span>
        <strong className="tw:text-[1.1538rem] tw:text-[#302426] tw:[html[data-workspace-theme=night]_&]:text-[#f7efe5]">Cronograma enviado para aprovação</strong>
        <p className="tw:m-0 tw:mt-[.2308rem] tw:text-[.8462rem] tw:leading-[1.45] tw:text-[#66534b] tw:[html[data-workspace-theme=night]_&]:text-[#d7c9bf]">Cronograma enviado para aprovação. A aprovação não altera datas nem inicia a contagem no dia da resposta. Início planejado: {startDate ? formatProjectDate(startDate) : 'A definir'}.</p>
      </div>
      <dl className="tw:relative tw:z-1 tw:m-0 tw:flex tw:min-w-[26.9231rem] tw:items-stretch tw:[@media(max-width:950px)]:w-full tw:[@media(max-width:950px)]:min-w-0 tw:[@media(max-width:620px)]:grid tw:[@media(max-width:620px)]:grid-cols-2 tw:[@media(max-width:620px)]:gap-[.7692rem]">
        {[
          ['Enviado em', formatDateTime(current?.requested_at)],
          ['Resposta prevista até', formatDateTime(current?.response_due_at)],
          ['Ajustes utilizados', `${used}/2`],
        ].map(([label, value]) => <div key={label} className="tw:grid tw:gap-[.2308rem] tw:border-l tw:border-solid tw:border-[#5a1e2d2b] tw:px-[1.0769rem] tw:first:border-l-0 tw:first:pl-0 tw:[@media(max-width:620px)]:border-l-0 tw:[@media(max-width:620px)]:p-0">
          <dt className="tw:text-[.6154rem] tw:font-black tw:tracking-[.06em] tw:text-[#896b3d] tw:uppercase tw:[html[data-workspace-theme=night]_&]:text-[#e0bd7b]">{label}</dt>
          <dd className="tw:m-0 tw:text-[.8462rem] tw:font-bold tw:whitespace-nowrap tw:text-[#403331] tw:[html[data-workspace-theme=night]_&]:text-[#f7efe5]">{value}</dd>
        </div>)}
      </dl>
      <button type="button" className={`${actionClass} tw:relative tw:z-1 tw:shadow-[0_.4615rem_1.0769rem_#5a1e2d1f] tw:[@media(max-width:950px)]:ml-auto tw:[@media(max-width:620px)]:ml-0`}
        onClick={() => setDialog('reminder')} disabled={!current}>Lembrar cliente</button>
    </section> : current && <section className={`${scheduleBanner} tw:[@media(max-width:950px)]:flex-col tw:[@media(max-width:950px)]:items-start`}>
      <div className="tw:grid tw:min-w-0 tw:gap-[.2308rem]">
        <span className="tw:text-[.6923rem] tw:font-black tw:tracking-[.1em] tw:text-[#7e4d5a]">AJUSTE SOLICITADO · {current.request_number}/2</span>
        <strong className="tw:text-[1rem] tw:text-cali-text">{change.targetLabel || 'Cronograma'}</strong>
        <p className="tw:m-0 tw:mt-[.2308rem] tw:text-[.8462rem] tw:leading-[1.45] tw:text-cali-muted">{current.response_note || 'O cliente solicitou uma alteração no cronograma.'}</p>
        {scheduleChangeSummary(change).map((item) => <span key={item} className="tw:mt-[.3077rem] tw:text-[.6923rem] tw:text-[#8a6738]">{item}</span>)}
      </div>
      <div className="tw:flex tw:items-center tw:gap-[.6154rem]">
        <button type="button" className={actionClass} onClick={() => setDialog('reject')}>Não aplicar</button>
        <button type="button" className={actionClass} onClick={() => setDialog('accept')}>Acolher solicitação</button>
      </div>
    </section>}
    {reviews.isError && <p role="alert" className="tw:text-cali-danger">{reviews.error.message} <button type="button" onClick={() => void reviews.refetch()}>Tentar novamente</button></p>}
    {dialog === 'reminder' && <ScheduleReminderDialog project={project} responseDate={formatDateTime(current?.response_due_at)}
      onClose={close} onSent={() => { close(); onNotice('Lembrete enviado ao cliente.'); }} />}
    {(dialog === 'accept' || dialog === 'reject') && current && <ScheduleAdjustmentDecisionDialog
      review={current} accept={dialog === 'accept'} onClose={close} onSaved={async () => { await Promise.all([onChanged(), reviews.refetch()]); close(); }} />}
  </>;
}
