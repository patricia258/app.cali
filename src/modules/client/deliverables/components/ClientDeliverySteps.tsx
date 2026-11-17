import { Check } from 'lucide-react';
import type { ClientVisibleTask } from '../../../../api/projects/client-delivery';
import { DeliveryProgress } from '../../../../components/projects/DeliveryProgress';

const statusLabel: Record<string, string> = {
  todo: 'A fazer',
  not_started: 'Pendente',
  pending: 'Pendente',
  in_progress: 'Em andamento',
  doing: 'Em andamento',
  done: 'Concluída',
  completed: 'Concluída',
  standby: 'Em espera',
  cancelled: 'Cancelada',
};

const isComplete = (task: ClientVisibleTask) => task.status === 'done' || task.status === 'completed';

type ClientDeliveryStepsProps = {
  tasks: readonly ClientVisibleTask[];
  formatDate: (value: string) => string;
};

export function ClientDeliverySteps({ tasks, formatDate }: ClientDeliveryStepsProps) {
  const complete = tasks.filter(isComplete).length;
  const current = tasks.find((task) => !isComplete(task));
  const title = tasks.length
    ? `${complete} de ${tasks.length} ${tasks.length === 1 ? 'etapa concluída' : 'etapas concluídas'}`
    : 'Nenhuma etapa compartilhada';
  const description = current
    ? `Etapa atual: ${current.title}`
    : tasks.length
      ? 'Todas as etapas compartilhadas foram concluídas.'
      : 'Aqui aparecem as etapas que a CALI define como visíveis para você.';

  return (
    <>
      <DeliveryProgress title={title} description={description} complete={complete} total={tasks.length} />
      {tasks.length > 0 && (
        <ol className="tw:m-0 tw:list-none tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-sand-line tw:p-0">
          {tasks.map((task, index) => {
            const complete = isComplete(task);
            const active = task.id === current?.id;
            const markerTone = complete
              ? 'tw:bg-cali-green-surface tw:text-cali-green-accent'
              : active
                ? 'tw:bg-cali-gold-soft tw:text-cali-gold-text'
                : 'tw:bg-cali-neutral-soft tw:text-cali-sand-text';

            return (
              <li
                key={task.id}
                aria-current={active ? 'step' : undefined}
                className={`tw:flex tw:items-center tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:px-5 tw:py-5 tw:last:border-0 tw:max-[34.375rem]:items-start ${active ? 'tw:bg-cali-gold-surface' : 'tw:bg-cali-neutral-surface'}`}
              >
                <span
                  aria-hidden="true"
                  className={`tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-cali-compact-control tw:text-xs tw:font-bold ${markerTone}`}
                >
                  {complete ? <Check size={15} /> : String(index + 1).padStart(2, '0')}
                </span>
                <div className="tw:min-w-0 tw:flex-1">
                  <strong className="tw:text-cali-body tw:text-cali-neutral-strong">{task.title}</strong>
                  <p className="tw:mt-1.5 tw:mb-0 tw:text-xs/[1.5] tw:text-cali-sand-text">
                    {[task.protocol, task.dueAt ? `prazo ${formatDate(task.dueAt)}` : '']
                      .filter(Boolean)
                      .join(' · ') || 'Etapa compartilhada pela CALI'}
                  </p>
                </div>
                <span
                  className={`tw:text-xs tw:whitespace-nowrap tw:max-[34.375rem]:whitespace-normal ${active ? 'tw:rounded-lg tw:border tw:border-solid tw:border-cali-gold-line tw:bg-cali-orange-surface tw:p-2 tw:text-cali-gold-text' : 'tw:text-cali-neutral-accent'}`}
                >
                  {statusLabel[task.status] || task.status}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
