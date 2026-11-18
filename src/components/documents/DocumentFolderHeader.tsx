import { WorkflowSegments } from '../ds/WorkflowControls';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export type DocumentLibraryLayout = 'covers' | 'list';

export function DocumentLayoutSwitch({ label, layout, onChange }: {
  label: string;
  layout: DocumentLibraryLayout;
  onChange: (layout: DocumentLibraryLayout) => void;
}) {
  return (
    <WorkflowSegments className="tw:shrink-0" aria-label={label}>
      <button type="button" className={layout === 'covers' ? 'on' : ''} aria-pressed={layout === 'covers'} onClick={() => onChange('covers')}>Capas</button>
      <button type="button" className={layout === 'list' ? 'on' : ''} aria-pressed={layout === 'list'} onClick={() => onChange('list')}>Lista</button>
    </WorkflowSegments>
  );
}

export function DocumentFolderProgress({ percentage, className }: { percentage: number; className?: string }) {
  return (
    <div className={`tw:h-2 tw:overflow-hidden tw:rounded-sm tw:bg-cali-neutral-soft ${className ?? ''}`} aria-hidden="true">
      <i className="tw:block tw:h-full tw:bg-cali-success" style={{ width: `${percentage}%` }} />
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
    <div className="tw:flex tw:items-stretch tw:gap-4.5 tw:max-[51.3125rem]:flex-col">
      <button className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-5 tw:text-cali-body/[inherit] tw:font-bold tw:whitespace-nowrap tw:text-cali-brand tw:max-[51.3125rem]:h-12.5 tw:max-[51.3125rem]:self-start" type="button" onClick={onBack}>
        <ArrowLeft size={14} /> Documentos
      </button>
      <header className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-wrap tw:items-center tw:justify-between tw:gap-5.5 tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-6 tw:py-5.5">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-4.5 tw:text-cali-brand">
          <FolderOpen className="tw:shrink-0" size={22} />
          <div className="tw:min-w-0">
            <h2 className="tw:m-0 tw:text-xl/[inherit] tw:text-cali-ink tw:[overflow-wrap:anywhere]">{title}</h2>
            <p className="tw:mt-1 tw:mb-0 tw:text-cali-body/[inherit] tw:text-cali-muted">{description}</p>
          </div>
        </div>
        <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-5">{children}</div>
      </header>
    </div>
  );
}
