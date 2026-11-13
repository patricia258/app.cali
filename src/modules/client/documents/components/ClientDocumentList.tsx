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
  folder: 'tw:border-l-[#b58c52]',
  delivery: 'tw:border-l-[#b58c52]',
  report: 'tw:border-l-[#946db4]',
  work: 'tw:border-l-[#5eac9a]',
};

export function ClientDocumentList({ rows }: { rows: Row[] }) {
  return (
    <div className="tw:overflow-hidden tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#e8dfd7] tw:bg-white">
      {rows.map(({ id, title, category, reference, status, tone, kind, onOpen }) => (
        <button
          type="button"
          key={id}
          className={`tw:grid tw:w-full tw:cursor-pointer tw:grid-cols-[2fr_1.2fr_1fr_1fr_1.385rem] tw:items-center tw:gap-[1.154rem] tw:border-0 tw:border-b tw:border-l-[0.231rem] tw:border-solid tw:border-b-[#f0eae5] tw:bg-white tw:px-[1.231rem] tw:py-[1.308rem] tw:text-left tw:text-[0.846rem]/[inherit] tw:text-[#756961] tw:hover:bg-[#fbf8f5] tw:max-[61.3125rem]:grid-cols-[1.6fr_1fr_1fr_1.538rem] tw:max-[43.8125rem]:grid-cols-[1fr_1fr_1.385rem] tw:max-[43.8125rem]:gap-[0.615rem] tw:max-[43.8125rem]:p-4 ${border[kind]}`}
          onClick={onOpen}
        >
          <strong className="tw:flex tw:min-w-0 tw:items-center tw:gap-[0.615rem] tw:text-[#3e3533]">
            {kind === 'folder' && <FolderOpen size={15} className="tw:shrink-0" />}
            <span className="tw:min-w-0 tw:[overflow-wrap:anywhere]">{title}</span>
          </strong>
          <span className="tw:max-[43.8125rem]:hidden">{category}</span>
          <span className="tw:max-[61.3125rem]:hidden">{reference}</span>
          <span className={`wf-tag ${tone}`}>{status}</span>
          <ChevronRight size={14} />
        </button>
      ))}
    </div>
  );
}
