import { ChevronDown, ChevronRight, FileText, FolderKanban } from 'lucide-react';
import type { ClientDeliveryItem, ClientVisibleTask } from '../../../../api/projects/client-delivery';
import { ClientDeliveryRowMetadata } from './ClientDeliveryRowMetadata';

type ClientDeliveryRowProps = {
  item: ClientDeliveryItem;
  statusLabel: string;
  subtasksExpanded: boolean;
  formatDate: (value?: string | null) => string;
  onOpen: () => void;
  onToggleSubtasks: () => void;
  onOpenSubtask: (task: ClientVisibleTask) => void;
};

export function ClientDeliveryRow({
  item,
  statusLabel,
  subtasksExpanded,
  formatDate,
  onOpen,
  onToggleSubtasks,
  onOpenSubtask,
}: ClientDeliveryRowProps) {
  const subtasks = item.visibleTasks || [];

  return (
    <>
      <div className="tw:relative tw:col-span-full tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2.77rem_minmax(0,1fr)_auto] tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4dd] tw:bg-white tw:p-[.92rem] tw:text-left tw:text-[#554340] tw:hover:bg-[#fcf8f5] tw:@min-[56rem]:grid-cols-subgrid tw:@min-[56rem]:gap-x-[1.154rem] tw:@min-[56rem]:px-[1.46rem] tw:@min-[56rem]:py-[1.23rem]">
        <span
          className="tw:grid tw:size-[2.77rem] tw:place-items-center tw:rounded-[.538rem] tw:bg-[#faf1ec] tw:text-cali-brand"
          aria-hidden="true"
        >
          {item.isDocument ? <FileText size={16} /> : <FolderKanban size={16} />}
        </span>
        <button
          type="button"
          className="tw:flex tw:min-w-0 tw:cursor-pointer tw:flex-col tw:gap-[.385rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:[color:inherit] tw:after:absolute tw:after:inset-0 tw:after:content-[''] tw:focus-visible:after:outline-2 tw:focus-visible:after:-outline-offset-2 tw:focus-visible:after:outline-cali-gold"
          aria-label={`Abrir ${item.title}`}
          onClick={onOpen}
        >
          <strong className="tw:text-[.923rem] tw:wrap-anywhere">{item.title}</strong>
          <small className="tw:text-[.77rem] tw:wrap-anywhere tw:text-[#a18e81]">
            {item.protocol || item.code || 'ENTREGÁVEL'}
          </small>
        </button>
        <ClientDeliveryRowMetadata
          complexity={item.complexity || 'MC1'}
          status={statusLabel}
          statusTone={
            item.status === 'client_review' ? 'review' : item.status === 'not_started' ? 'scheduled' : 'active'
          }
          due={formatDate(item.dueAt)}
        >
          {subtasks.length > 0 ? (
            <button
              type="button"
              className="tw:relative tw:z-10 tw:inline-flex tw:w-fit tw:min-h-[2.15rem] tw:cursor-pointer tw:items-center tw:gap-[.46rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-white tw:px-[.77rem] tw:text-[.885rem] tw:font-bold tw:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold"
              aria-expanded={subtasksExpanded}
              title={subtasksExpanded ? 'Recolher subtarefas' : 'Mostrar subtarefas'}
              onClick={onToggleSubtasks}
            >
              {subtasksExpanded ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronRight size={14} aria-hidden="true" />
              )}
              {subtasks.length} {subtasks.length === 1 ? 'subtarefa' : 'subtarefas'}
            </button>
          ) : (
            <span className="tw:hidden tw:text-[#b5a79d] tw:@min-[56rem]:inline">—</span>
          )}
        </ClientDeliveryRowMetadata>
      </div>
      {subtasksExpanded &&
        subtasks.map((task) => {
          const waitingReview = task.status === 'client_review';
          const scheduled = task.status === 'todo';
          const complete = ['done', 'approved', 'completed'].includes(task.status);

          return (
            <button
              type="button"
              key={task.id}
              className="tw:col-span-full tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2.77rem_minmax(0,1fr)_auto] tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-dashed tw:border-[#eee4dd] tw:bg-transparent tw:px-[.92rem] tw:py-[.77rem] tw:text-left tw:text-[#554340] tw:hover:bg-[#fbf7f4] tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-cali-gold tw:@min-[56rem]:grid-cols-subgrid tw:@min-[56rem]:gap-x-[1.154rem] tw:@min-[56rem]:px-[1.46rem]"
              title="Abrir esta parte"
              onClick={() => onOpenSubtask(task)}
            >
              <span
                aria-hidden="true"
                className="tw:-mt-[1.38rem] tw:ml-[1.08rem] tw:h-[1.69rem] tw:rounded-bl-[.615rem] tw:border-b-[.115rem] tw:border-l-[.115rem] tw:border-solid tw:border-[#d9c7ba]"
              />
              <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.385rem]">
                <strong className="tw:text-[.96rem] tw:wrap-anywhere">{task.title}</strong>
                <small className="tw:text-[.77rem] tw:wrap-anywhere tw:text-[#a18e81]">
                  {task.protocol || 'SUBTAREFA'}
                </small>
              </span>
              <ClientDeliveryRowMetadata
                complexity={task.complexity}
                status={
                  scheduled
                    ? 'Programada'
                    : waitingReview
                      ? 'Aguardando você'
                      : complete
                        ? 'Concluída'
                        : 'Em andamento'
                }
                statusTone={scheduled ? 'scheduled' : waitingReview ? 'review' : 'active'}
                due={formatDate(task.dueAt)}
              >
                <span className="tw:hidden tw:@min-[56rem]:inline" aria-hidden="true" />
              </ClientDeliveryRowMetadata>
            </button>
          );
        })}
    </>
  );
}
