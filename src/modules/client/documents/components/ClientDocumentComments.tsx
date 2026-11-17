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
    <div className="tw:fixed tw:inset-0 tw:z-100 tw:flex tw:items-center tw:justify-center tw:bg-cali-burgundy-inverse/50 tw:p-5.5" role="presentation">
      <DialogFrame className="tw:max-h-[calc(100dvh-2.77rem)] tw:w-full tw:max-w-[45.385rem] tw:overflow-y-auto tw:rounded-2xl tw:bg-cali-neutral-surface tw:p-7.5 tw:shadow-[0_1.154rem_4.615rem_rgb(var(--cali-rgb-burgundy-inverse)/0.1961)]" aria-label={`Comentários de ${title}`}>
        <header className="tw:mb-6 tw:flex tw:items-center tw:justify-between tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:pb-5 tw:text-cali-label/[inherit] tw:font-bold tw:tracking-widest tw:text-cali-muted">
          <span>COMENTÁRIOS DO DOCUMENTO</span>
          <button type="button" className="tw:grid tw:size-9 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:p-0 tw:text-cali-neutral-text" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        <h2 className="tw:mt-0 tw:mb-3 tw:text-cali-title/[inherit] tw:font-bold tw:tracking-[-0.046rem]">{title}</h2>
        <p className="tw:mt-4 tw:mb-5.5 tw:text-sm/[1.65] tw:text-cali-muted">{protocol}</p>
        <div className="tw:overflow-y-auto tw:px-7.5 tw:pt-1 tw:pb-5.5">
          {loading ? <LoadingState aria-live="polite" aria-busy="true">Carregando…</LoadingState> : comments.map((comment) => (
            <div key={comment.id} className={`tw:mb-4.5 tw:max-w-[89%] tw:rounded-xl tw:border tw:border-solid tw:p-4.5 ${comment.mine ? 'tw:ml-auto tw:border-cali-burgundy-surface tw:bg-cali-danger-surface' : 'tw:border-cali-sand-line tw:bg-cali-surface-soft'}`}>
              <p className="tw:my-2 tw:text-sm/[1.6] tw:text-cali-muted tw:[overflow-wrap:anywhere]">{comment.body}</p>
              <small className="tw:text-cali-label/[inherit] tw:text-cali-sand-text">{comment.createdAt}</small>
            </div>
          ))}
        </div>
        <div className="tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-soft tw:px-7.5 tw:pt-5.5 tw:pb-6">
          <textarea className="tw:h-21 tw:w-full tw:resize-y tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:px-3 tw:py-2 tw:text-cali-body/[inherit]" rows={3} value={draft} onChange={(event) => onDraft(event.target.value)} placeholder="Escreva um comentário sobre este documento…" aria-label="Comentário" />
          <div className="tw:mt-2.5 tw:flex tw:items-center tw:justify-between">
            <Button type="button" variant="workflowPrimary" disabled={!draft.trim()} onClick={onSend}><Send size={16} />Enviar comentário</Button>
          </div>
        </div>
      </DialogFrame>
    </div>
  );
}
