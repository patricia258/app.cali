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
    <div className="tw:fixed tw:inset-0 tw:z-100 tw:flex tw:items-center tw:justify-center tw:bg-[#1c151b80] tw:p-[1.385rem]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <DialogFrame className="tw:max-h-[calc(100dvh-2.77rem)] tw:w-full tw:max-w-[47.692rem] tw:overflow-y-auto tw:rounded-[1rem] tw:bg-white tw:p-[1.923rem] tw:shadow-[0_1.154rem_4.615rem_#22172232]" aria-label={`Informações de ${doc.title}`}>
        <header className="tw:mb-[1.462rem] tw:flex tw:items-center tw:justify-between tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-[#eee8e2] tw:pb-[1.231rem] tw:text-[0.692rem]/[inherit] tw:font-bold tw:tracking-widest tw:text-[#a38571]">
          <span>DOCUMENTO{doc.protocol ? ` · ${doc.protocol}` : ''}</span>
          <button type="button" className="tw:grid tw:size-[2.308rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#ece4dd] tw:bg-[#faf6f3] tw:p-0 tw:text-[#6b4d4a]" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <h2 className="tw:mt-0 tw:mb-[0.769rem] tw:text-[1.615rem]/[inherit] tw:font-bold tw:tracking-[-0.046rem]">{doc.title}</h2>
        {doc.description && <p className="tw:mt-4 tw:mb-[1.385rem] tw:text-[0.846rem]/[1.65] tw:text-[#82786f]">{doc.description}</p>}
        <span className={`wf-tag ${state.tone}`}>{state.label}</span>
        <dl className="tw:mt-[1.385rem] tw:mb-0 tw:grid tw:grid-cols-3 tw:gap-[0.923rem] tw:max-[40.6875rem]:grid-cols-1">
          {facts.map(({ label, value }) => (
            <div className="tw:flex tw:flex-col tw:gap-[0.538rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#eee5dd] tw:p-4 tw:text-[0.769rem]/[inherit] tw:text-[#998c83]" key={label}>
              <dt>{label}</dt>
              <dd className="tw:m-0 tw:text-[0.846rem]/[inherit] tw:font-bold tw:text-[#4f4140]">{value}</dd>
            </div>
          ))}
        </dl>
        <footer className="tw:mt-[1.538rem] tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.692rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eee8e2] tw:pt-[1.231rem]">
          <Button type="button" variant="unstyled" className="tw:cursor-pointer tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e9ddd5] tw:bg-white tw:px-[1.077rem] tw:py-[0.769rem] tw:text-[0.846rem]/[inherit] tw:text-[#77685f]" onClick={onClose}>Fechar</Button>
          <Button type="button" variant="workflowOutline" onClick={onComment}><MessageSquare size={14} /> Comentar</Button>
          {doc.requiresAcknowledgement && !acknowledged && <Button type="button" variant="workflowOutline" onClick={onAcknowledge}><FileCheck2 size={14} /> Registrar ciência</Button>}
          <Button type="button" variant="workflowPrimary" onClick={onOpen}><ExternalLink size={14} /> Abrir documento</Button>
        </footer>
      </DialogFrame>
    </div>
  );
}
