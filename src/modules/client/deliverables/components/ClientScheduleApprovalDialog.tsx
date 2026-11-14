import type { ClientScheduleReview } from '../../../../api/projects/schedule';
import { useApproveClientSchedule } from '../hooks/useApproveClientSchedule';
import { scheduleReviewDate } from '../scheduleReviewDate';
import { ClientScheduleDialog } from './ClientScheduleDialog';

type Props = {
  project: ClientScheduleReview['project'];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function ClientScheduleApprovalDialog({ project, onClose, onSaved }: Props) {
  const approval = useApproveClientSchedule(project.id, onSaved);

  return <ClientScheduleDialog title="Aprovar cronograma" kicker="Aprovação final" action="Aprovar cronograma"
    cancelLabel="Voltar" pending={approval.isPending} error={approval.error?.message} onClose={onClose}
    onSubmit={() => approval.mutate()}>
    <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:max-sm:grid-cols-1">
      <strong className="tw:col-span-full tw:text-sm">{project.name}</strong>
      <p className="tw:col-span-full tw:m-0 tw:text-xs tw:leading-relaxed tw:text-cali-muted">Ao aprovar, você confirma que concorda com este cronograma e a CALI começa a executar o projeto.</p>
      <dl className="tw:contents tw:[&_div]:grid tw:[&_div]:min-w-0 tw:[&_div]:gap-1 tw:[&_div]:rounded-lg tw:[&_div]:border tw:[&_div]:border-solid tw:[&_div]:border-cali-line tw:[&_div]:bg-(--theme-surface-soft) tw:[&_div]:px-3.5 tw:[&_div]:py-3 tw:[&_dt]:text-[.6875rem] tw:[&_dt]:text-cali-muted tw:[&_dd]:m-0 tw:[&_dd]:text-sm tw:[&_dd]:font-bold tw:[&_dd]:text-cali-accent">
        <div><dt>Início planejado</dt><dd>{scheduleReviewDate(project.start_date || project.roadmap_start_date)}</dd></div>
        <div><dt>Conclusão prevista</dt><dd>{scheduleReviewDate(project.roadmap_end_date)}</dd></div>
      </dl>
    </div>
    <div className="tw:grid tw:gap-2 tw:rounded-lg tw:bg-(--theme-surface-soft) tw:px-4 tw:py-3.5 tw:text-xs tw:leading-relaxed">
      <strong>O que acontece depois de aprovar</strong>
      <ul className="tw:m-0 tw:grid tw:gap-1 tw:pl-4 tw:text-cali-muted">
        <li>As datas do cronograma continuam as mesmas.</li>
        <li>A data da sua aprovação fica registrada.</li>
      </ul>
    </div>
  </ClientScheduleDialog>;
}
