import { Send, X } from 'lucide-react';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { LoadingState } from '../../../../components/ds/LoadingState';

export type DocumentComment = { id: string; body: string; createdAt: string; mine: boolean };

export function ClientDocumentComments({ title, protocol, comments, draft, loading, onDraft, onSend, onClose }: {
  title: string;
  protocol: string;
  comments: DocumentComment[];
  draft: string;
  loading: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="tw:fixed tw:inset-0 tw:z-100 tw:flex tw:items-center tw:justify-center tw:bg-[#1c151b80] tw:p-[1.385rem]" role="presentation">
      <DialogFrame className="tw:max-h-[calc(100dvh-2.77rem)] tw:w-full tw:max-w-[45.385rem] tw:overflow-y-auto tw:rounded-[1rem] tw:bg-white tw:p-[1.923rem] tw:shadow-[0_1.154rem_4.615rem_#22172232]" aria-label={`Comentários de ${title}`}>
        <header className="tw:mb-[1.462rem] tw:flex tw:items-center tw:justify-between tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-[#eee8e2] tw:pb-[1.231rem] tw:text-[0.692rem]/[inherit] tw:font-bold tw:tracking-widest tw:text-[#a38571]">
          <span>COMENTÁRIOS DO DOCUMENTO</span>
          <button type="button" className="tw:grid tw:size-[2.308rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#ece4dd] tw:bg-[#faf6f3] tw:p-0 tw:text-[#6b4d4a]" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        <h2 className="tw:mt-0 tw:mb-[0.769rem] tw:text-[1.615rem]/[inherit] tw:font-bold tw:tracking-[-0.046rem]">{title}</h2>
        <p className="tw:mt-4 tw:mb-[1.385rem] tw:text-[0.846rem]/[1.65] tw:text-[#82786f]">{protocol}</p>
        <div className="tw:overflow-y-auto tw:px-[1.846rem] tw:pt-[0.308rem] tw:pb-[1.385rem]">
          {loading ? <LoadingState aria-live="polite" aria-busy="true">Carregando…</LoadingState> : comments.map((comment) => (
            <div key={comment.id} className={`tw:mb-[1.077rem] tw:max-w-[89%] tw:rounded-[0.769rem] tw:border tw:border-solid tw:p-[1.077rem] ${comment.mine ? 'tw:ml-auto tw:border-[#eddce2] tw:bg-[#f6edf0]' : 'tw:border-[#ebe3dc] tw:bg-[#faf7f4]'}`}>
              <p className="tw:my-[0.538rem] tw:text-[0.846rem]/[1.6] tw:text-[#82786f] tw:[overflow-wrap:anywhere]">{comment.body}</p>
              <small className="tw:text-[0.692rem]/[inherit] tw:text-[#a19a92]">{comment.createdAt}</small>
            </div>
          ))}
        </div>
        <div className="tw:border-0 tw:border-t tw:border-solid tw:border-[#eee7e1] tw:px-[1.846rem] tw:pt-[1.385rem] tw:pb-[1.538rem]">
          <textarea className="tw:h-[5.231rem] tw:w-full tw:resize-y tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:px-3 tw:py-2 tw:text-[0.923rem]/[inherit]" rows={3} value={draft} onChange={(event) => onDraft(event.target.value)} placeholder="Escreva um comentário sobre este documento…" aria-label="Comentário" />
          <div className="tw:mt-[0.615rem] tw:flex tw:items-center tw:justify-between">
            <Button type="button" variant="workflowPrimary" disabled={!draft.trim()} onClick={onSend}><Send size={16} />Enviar comentário</Button>
          </div>
        </div>
      </DialogFrame>
    </div>
  );
}
