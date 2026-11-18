import type { WorkspaceProject } from '../../../domain/projects';
import { useSendScheduleReminder } from '../hooks/useSendScheduleReminder';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  project: WorkspaceProject;
  responseDate: string;
  onClose: () => void;
  onSent: () => void;
};

export function ScheduleReminderDialog({ project, responseDate, onClose, onSent }: Props) {
  const mutation = useSendScheduleReminder(project, onSent);
  return <ProjectActionDialog title="Enviar lembrete ao cliente" kicker="Acompanhamento do cronograma"
    action="Enviar lembrete" pendingLabel="Enviando…" pending={mutation.isPending} error={mutation.error?.message}
    onClose={onClose} onSubmit={() => mutation.mutate()}>
    <div className="tw:grid tw:gap-1.5 tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-cali-gold/42 tw:bg-cali-gold/10 tw:px-4 tw:py-3.5">
      <strong>O cliente receberá um lembrete sobre a aprovação pendente.</strong>
      <p className="tw:m-0 tw:text-cali-detail tw:leading-[1.45] tw:text-cali-muted">O cronograma continuará aguardando a decisão dele. Esta ação registra uma notificação no Workspace e não altera prazos nem status.</p>
    </div>
    <dl className="tw:m-0 tw:grid tw:gap-1.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-4.5 tw:py-3.5">
      {[['Projeto', project.name], ['Resposta prevista', responseDate]].map(([label, value]) => <div key={label}
        className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-solid tw:border-cali-line tw:pt-2">
        <dt className="tw:text-xs tw:text-cali-muted">{label}</dt><dd className="tw:m-0 tw:text-cali-detail tw:font-bold">{value}</dd>
      </div>)}
    </dl>
  </ProjectActionDialog>;
}
