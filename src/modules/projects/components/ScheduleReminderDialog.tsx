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
    <div className="tw:grid tw:gap-[.3846rem] tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-[#b58c526b] tw:bg-[#b58c521a] tw:px-[1rem] tw:py-[.9231rem]">
      <strong>O cliente receberá um lembrete sobre a aprovação pendente.</strong>
      <p className="tw:m-0 tw:text-[.8077rem] tw:leading-[1.45] tw:text-cali-muted">O cronograma continuará aguardando a decisão dele. Esta ação registra uma notificação no Workspace e não altera prazos nem status.</p>
    </div>
    <dl className="tw:m-0 tw:grid tw:gap-[.3846rem] tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.1538rem] tw:py-[.9231rem]">
      {[['Projeto', project.name], ['Resposta prevista', responseDate]].map(([label, value]) => <div key={label}
        className="tw:flex tw:items-center tw:justify-between tw:gap-[.7692rem] tw:border-t tw:border-solid tw:border-cali-line tw:pt-[.5385rem]">
        <dt className="tw:text-[.7308rem] tw:text-cali-muted">{label}</dt><dd className="tw:m-0 tw:text-[.8077rem] tw:font-bold">{value}</dd>
      </div>)}
    </dl>
  </ProjectActionDialog>;
}
