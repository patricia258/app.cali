import { ArrowLeft, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export type DocumentLibraryLayout = 'covers' | 'list';

export function DocumentLayoutSwitch({ label, layout, onChange }: {
  label: string;
  layout: DocumentLibraryLayout;
  onChange: (layout: DocumentLibraryLayout) => void;
}) {
  return (
    <div className="wf-segments tw:shrink-0" aria-label={label}>
      <button type="button" className={layout === 'covers' ? 'on' : ''} aria-pressed={layout === 'covers'} onClick={() => onChange('covers')}>Capas</button>
      <button type="button" className={layout === 'list' ? 'on' : ''} aria-pressed={layout === 'list'} onClick={() => onChange('list')}>Lista</button>
    </div>
  );
}

export function DocumentFolderProgress({ percentage, className }: { percentage: number; className?: string }) {
  return (
    <div className={`tw:h-[0.462rem] tw:overflow-hidden tw:rounded-[0.308rem] tw:bg-[#efe7e0] ${className ?? ''}`} aria-hidden="true">
      <i className="tw:block tw:h-full tw:bg-[#356448]" style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function DocumentFolderHeader({ title, description, onBack, children }: {
  title: string;
  description: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="tw:flex tw:items-stretch tw:gap-[1.077rem] tw:max-[51.3125rem]:flex-col">
      <button className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[1.231rem] tw:text-[0.962rem]/[inherit] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand tw:max-[51.3125rem]:h-[3.077rem] tw:max-[51.3125rem]:self-start" type="button" onClick={onBack}>
        <ArrowLeft size={14} /> Documentos
      </button>
      <header className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-wrap tw:items-center tw:justify-between tw:gap-[1.385rem] tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:px-[1.538rem] tw:py-[1.385rem]">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-[1.077rem] tw:text-cali-brand">
          <FolderOpen className="tw:shrink-0" size={22} />
          <div className="tw:min-w-0">
            <h2 className="tw:m-0 tw:text-[1.308rem]/[inherit] tw:text-cali-ink tw:[overflow-wrap:anywhere]">{title}</h2>
            <p className="tw:mt-[0.231rem] tw:mb-0 tw:text-[0.923rem]/[inherit] tw:text-[#7d726b]">{description}</p>
          </div>
        </div>
        <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-[1.231rem]">{children}</div>
      </header>
    </div>
  );
}
