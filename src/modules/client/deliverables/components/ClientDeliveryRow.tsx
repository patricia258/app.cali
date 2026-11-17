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
      <div className="tw:relative tw:col-span-full tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2.77rem_minmax(0,1fr)_auto] tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-3.5 tw:text-left tw:text-cali-neutral-text tw:hover:bg-cali-sand-surface tw:@min-[56rem]:grid-cols-subgrid tw:@min-[56rem]:gap-x-4.5 tw:@min-[56rem]:px-6 tw:@min-[56rem]:py-5">
        <span
          className="tw:grid tw:size-11 tw:place-items-center tw:rounded-lg tw:bg-cali-sand-soft tw:text-cali-brand"
          aria-hidden="true"
        >
          {item.isDocument ? <FileText size={16} /> : <FolderKanban size={16} />}
        </span>
        <button
          type="button"
          className="tw:flex tw:min-w-0 tw:cursor-pointer tw:flex-col tw:gap-1.5 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:[color:inherit] tw:after:absolute tw:after:inset-0 tw:after:content-[''] tw:focus-visible:after:outline-2 tw:focus-visible:after:-outline-offset-2 tw:focus-visible:after:outline-cali-gold"
          aria-label={`Abrir ${item.title}`}
          onClick={onOpen}
        >
          <strong className="tw:text-cali-body tw:wrap-anywhere">{item.title}</strong>
          <small className="tw:text-xs tw:wrap-anywhere tw:text-cali-sand-text">
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
              className="tw:relative tw:z-10 tw:inline-flex tw:w-fit tw:min-h-[2.15rem] tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3 tw:text-sm tw:font-bold tw:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold"
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
            <span className="tw:hidden tw:text-cali-sand-accent tw:@min-[56rem]:inline">—</span>
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
              className="tw:col-span-full tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2.77rem_minmax(0,1fr)_auto] tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-dashed tw:border-cali-line tw:bg-transparent tw:px-3.5 tw:py-3 tw:text-left tw:text-cali-neutral-text tw:hover:bg-cali-surface-soft tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-cali-gold tw:@min-[56rem]:grid-cols-subgrid tw:@min-[56rem]:gap-x-4.5 tw:@min-[56rem]:px-6"
              title="Abrir esta parte"
              onClick={() => onOpenSubtask(task)}
            >
              <span
                aria-hidden="true"
                className="tw:-mt-5.5 tw:ml-4.5 tw:h-7 tw:rounded-bl-cali-compact-control tw:border-b-[.115rem] tw:border-l-[.115rem] tw:border-solid tw:border-cali-line-strong"
              />
              <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5">
                <strong className="tw:text-cali-body tw:wrap-anywhere">{task.title}</strong>
                <small className="tw:text-xs tw:wrap-anywhere tw:text-cali-sand-text">
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
