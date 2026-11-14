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
        <ol className="tw:m-0 tw:list-none tw:overflow-hidden tw:rounded-[.769rem] tw:border tw:border-solid tw:border-[#eee1d8] tw:p-0">
          {tasks.map((task, index) => {
            const complete = isComplete(task);
            const active = task.id === current?.id;
            const markerTone = complete
              ? 'tw:bg-[#e5f5eb] tw:text-[#24825a]'
              : active
                ? 'tw:bg-[#fff0cc] tw:text-[#92641f]'
                : 'tw:bg-[#f2ede9] tw:text-[#8d7f73]';

            return (
              <li
                key={task.id}
                aria-current={active ? 'step' : undefined}
                className={`tw:flex tw:items-center tw:gap-[1.077rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f0e9e4] tw:px-[1.308rem] tw:py-[1.231rem] tw:last:border-0 tw:max-[34.375rem]:items-start ${active ? 'tw:bg-[#fffbf1]' : 'tw:bg-white'}`}
              >
                <span
                  aria-hidden="true"
                  className={`tw:grid tw:size-[2.462rem] tw:shrink-0 tw:place-items-center tw:rounded-[.615rem] tw:text-[.769rem] tw:font-bold ${markerTone}`}
                >
                  {complete ? <Check size={15} /> : String(index + 1).padStart(2, '0')}
                </span>
                <div className="tw:min-w-0 tw:flex-1">
                  <strong className="tw:text-[.923rem] tw:text-[#413936]">{task.title}</strong>
                  <p className="tw:mt-[.385rem] tw:mb-0 tw:text-[.769rem]/[1.5] tw:text-[#92847a]">
                    {[task.protocol, task.dueAt ? `prazo ${formatDate(task.dueAt)}` : '']
                      .filter(Boolean)
                      .join(' · ') || 'Etapa compartilhada pela CALI'}
                  </p>
                </div>
                <span
                  className={`tw:text-[.769rem] tw:whitespace-nowrap tw:max-[34.375rem]:whitespace-normal ${active ? 'tw:rounded-[.538rem] tw:border tw:border-solid tw:border-[#efd8af] tw:bg-[#fff1d9] tw:p-[.538rem] tw:text-[#8e6227]' : 'tw:text-[#807c76]'}`}
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
