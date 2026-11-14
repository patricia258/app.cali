import { ProjectComplexityBadge } from '../../../components/projects/ProjectComplexityBadge';
import { useState, type DragEvent } from 'react';
import { deliverableLabels, formatProjectDate, type DeliverableStatus, type ProjectDeliverable } from '../../../domain/projects';

const columns: DeliverableStatus[] = ['not_started', 'in_progress', 'internal_review', 'client_review', 'adjustment_requested', 'rebriefing', 'approved'];
const partnerColumns = new Set<DeliverableStatus>(['not_started', 'in_progress', 'internal_review']);

type Props = {
  items: ProjectDeliverable[];
  staff: boolean;
  onOpen: (item: ProjectDeliverable) => void;
  onMove: (item: ProjectDeliverable, status: DeliverableStatus) => void;
};

export function ProjectKanban({ items, staff, onOpen, onMove }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [target, setTarget] = useState<DeliverableStatus | null>(null);
  const dragged = items.find((item) => item.id === draggedId);

  function clearDrag() {
    setDraggedId(null);
    setTarget(null);
  }

  function canMoveTo(status: DeliverableStatus) {
    return Boolean(dragged && dragged.status !== 'approved' && dragged.status !== status
      && (!staff || (partnerColumns.has(dragged.status) && partnerColumns.has(status))));
  }

  function drop(event: DragEvent, status: DeliverableStatus) {
    event.preventDefault();
    if (dragged && canMoveTo(status)) onMove(dragged, status);
    clearDrag();
  }

  return <div data-project-kanban className="tw:mt-[1.25rem] tw:flex tw:gap-3 tw:overflow-x-auto tw:overflow-y-hidden tw:pb-1 tw:[scrollbar-width:none]">
    {columns.map((status) => {
      const cards = items.filter((item) => item.status === status);
      return <div key={status} data-project-kanban-column={status}
        className={`tw:flex tw:basis-[18.75rem] tw:shrink-0 tw:flex-col tw:gap-2.5 tw:rounded-[0.6875rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:p-3 ${staff ? 'tw:max-[55.375rem]:basis-[17rem]' : ''} ${target === status ? 'tw:bg-[color-mix(in_srgb,var(--theme-accent)_8%,var(--theme-surface))] tw:outline-2 tw:-outline-offset-2 tw:outline-cali-accent/55' : 'tw:bg-[#fbf7f3]'}`}
        onDragOver={(event) => {
          if (!canMoveTo(status)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setTarget(status);
        }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            setTarget((current) => current === status ? null : current);
          }
        }}
        onDrop={(event) => drop(event, status)}>
        <header className="tw:flex tw:items-center tw:justify-between tw:px-0.5 tw:pt-0.5 tw:pb-1 tw:text-[0.85rem]">
          <strong>{staff && status === 'internal_review' ? 'Revisão da Patricia' : deliverableLabels[status]}</strong>
          <span className="tw:text-[#978980]">{cards.length}</span>
        </header>
        {cards.map((item) => {
          const draggable = staff ? partnerColumns.has(status) : status !== 'approved';
          return <button key={item.id} type="button" draggable={draggable} onClick={() => onOpen(item)}
            className={`tw:flex tw:flex-col tw:gap-1.5 tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-[#eee2d9] tw:bg-white tw:p-[0.85rem] tw:text-left tw:text-[#392f2a] tw:[font:inherit] ${draggable ? 'tw:cursor-grab tw:active:cursor-grabbing' : 'tw:cursor-pointer'} ${dragged?.id === item.id ? 'tw:opacity-45' : ''}`}
            onDragStart={(event) => {
              if (!draggable) { event.preventDefault(); return; }
              event.dataTransfer.setData('text/plain', item.id);
              event.dataTransfer.effectAllowed = 'move';
              setDraggedId(item.id);
            }} onDragEnd={clearDrag}>
            <small className="tw:text-[0.7rem] tw:text-[#a39790]">{item.protocol}</small>
            <strong className="tw:text-[0.925rem]">{item.title}</strong>
            <p className="tw:m-0 tw:text-xs tw:text-[#978980]">{item.workstream}</p>
            <footer className="tw:mt-1 tw:flex tw:items-center tw:justify-between">
              <ProjectComplexityBadge code={item.complexity} explain />
              <time className="tw:text-xs tw:font-extrabold tw:text-cali-gold">{formatProjectDate(item.dueAt)}</time>
            </footer>
          </button>;
        })}
      </div>;
    })}
  </div>;
}
