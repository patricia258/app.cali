import { StatusBadge } from '../../../../components/ds/StatusBadge';
import { ChevronRight, FolderOpen } from 'lucide-react';

type Row = {
  id: string;
  title: string;
  category: string;
  reference: string;
  status: string;
  tone: string;
  kind: 'folder' | 'delivery' | 'report' | 'work';
  onOpen: () => void;
};

const border = {
  folder: 'tw:border-l-cali-gold',
  delivery: 'tw:border-l-cali-gold',
  report: 'tw:border-l-cali-violet-accent',
  work: 'tw:border-l-cali-teal-accent',
};

export function ClientDocumentList({ rows }: { rows: Row[] }) {
  return (
    <div className="tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface">
      {rows.map(({ id, title, category, reference, status, tone, kind, onOpen }) => (
        <button
          type="button"
          key={id}
          className={`tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2fr_1.2fr_1fr_1fr_1.385rem] tw:items-center tw:gap-4.5 tw:border-0 tw:border-b tw:border-l-[0.231rem] tw:border-solid tw:border-b-cali-line tw:bg-cali-neutral-surface tw:px-5 tw:py-5 tw:text-left tw:text-sm/[inherit] tw:text-cali-muted tw:hover:bg-cali-surface-soft tw:max-[61.3125rem]:grid-cols-[1.6fr_1fr_1fr_1.538rem] tw:max-[43.8125rem]:grid-cols-[1fr_1fr_1.385rem] tw:max-[43.8125rem]:gap-2.5 tw:max-[43.8125rem]:p-4 ${border[kind]}`}
          onClick={onOpen}
        >
          <strong className="tw:flex tw:min-w-0 tw:items-center tw:gap-2.5 tw:text-cali-text">
            {kind === 'folder' && <FolderOpen size={15} className="tw:shrink-0" />}
            <span className="tw:min-w-0 tw:[overflow-wrap:anywhere]">{title}</span>
          </strong>
          <span className="tw:max-[43.8125rem]:hidden">{category}</span>
          <span className="tw:max-[61.3125rem]:hidden">{reference}</span>
          <StatusBadge variant="workflow" tone={tone}>{status}</StatusBadge>
          <ChevronRight size={14} />
        </button>
      ))}
    </div>
  );
}
