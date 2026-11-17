import { StatusBadge } from '../../../../components/ds/StatusBadge';
import { ExternalLink, FileCheck2, MessageSquare, X } from 'lucide-react';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import type { ClientDoc } from '../ClientDocumentsPage';

export function ClientDocumentDetails({ doc, state, facts, acknowledged, onClose, onComment, onAcknowledge, onOpen }: {
  doc: ClientDoc;
  state: { tone: string; label: string };
  facts: Array<{ label: string; value: string }>;
  acknowledged: boolean;
  onClose: () => void;
  onComment: () => void;
  onAcknowledge: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="tw:fixed tw:inset-0 tw:z-100 tw:flex tw:items-center tw:justify-center tw:bg-cali-burgundy-inverse/50 tw:p-5.5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <DialogFrame className="tw:max-h-[calc(100dvh-2.77rem)] tw:w-full tw:max-w-[47.692rem] tw:overflow-y-auto tw:rounded-2xl tw:bg-cali-neutral-surface tw:p-7.5 tw:shadow-[0_1.154rem_4.615rem_rgb(var(--cali-rgb-burgundy-inverse)/0.1961)]" aria-label={`Informações de ${doc.title}`}>
        <header className="tw:mb-6 tw:flex tw:items-center tw:justify-between tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:pb-5 tw:text-cali-label/[inherit] tw:font-bold tw:tracking-widest tw:text-cali-muted">
          <span>DOCUMENTO{doc.protocol ? ` · ${doc.protocol}` : ''}</span>
          <button type="button" className="tw:grid tw:size-9 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:p-0 tw:text-cali-neutral-text" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <h2 className="tw:mt-0 tw:mb-3 tw:text-cali-title/[inherit] tw:font-bold tw:tracking-[-0.046rem]">{doc.title}</h2>
        {doc.description && <p className="tw:mt-4 tw:mb-5.5 tw:text-sm/[1.65] tw:text-cali-muted">{doc.description}</p>}
        <StatusBadge variant="workflow" tone={state.tone}>{state.label}</StatusBadge>
        <dl className="tw:mt-5.5 tw:mb-0 tw:grid tw:grid-cols-3 tw:gap-3.5 tw:max-[40.6875rem]:grid-cols-1">
          {facts.map(({ label, value }) => (
            <div className="tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:p-4 tw:text-xs/[inherit] tw:text-cali-sand-text" key={label}>
              <dt>{label}</dt>
              <dd className="tw:m-0 tw:text-sm/[inherit] tw:font-bold tw:text-cali-neutral-text">{value}</dd>
            </div>
          ))}
        </dl>
        <footer className="tw:mt-6 tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:pt-5">
          <Button type="button" variant="unstyled" className="tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3 tw:text-sm/[inherit] tw:text-cali-muted" onClick={onClose}>Fechar</Button>
          <Button type="button" variant="workflowOutline" onClick={onComment}><MessageSquare size={14} /> Comentar</Button>
          {doc.requiresAcknowledgement && !acknowledged && <Button type="button" variant="workflowOutline" onClick={onAcknowledge}><FileCheck2 size={14} /> Registrar ciência</Button>}
          <Button type="button" variant="workflowPrimary" onClick={onOpen}><ExternalLink size={14} /> Abrir documento</Button>
        </footer>
      </DialogFrame>
    </div>
  );
}
