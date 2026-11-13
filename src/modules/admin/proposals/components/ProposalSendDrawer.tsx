import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { DocumentAction } from '../../../../components/workspace/components/DocumentAction';

type ProposalSendDrawerProps = {
  service: string;
  protocol: string;
  recipient: string;
  email: string;
  fileName: string;
  archivedVersion?: number;
  sendingAgain: boolean;
  sending: boolean;
  file: File | null;
  note: string;
  sentMessage: string;
  error: string;
  onClose: () => void;
  onFile: (file: File | null) => void;
  onNote: (note: string) => void;
  onSend: () => void;
};

const sectionStyle = 'tw:mb-3 tw:rounded-xl tw:border tw:border-solid tw:border-[var(--line)] tw:p-[1.125rem]';
const headingStyle = 'tw:mt-0 tw:mb-2.5 tw:text-[var(--v2-text,var(--graphite))]';
const copyStyle = 'tw:text-cali-small/[1.55]!';
const fieldStyle = 'tw:mt-1.5 tw:block tw:w-full tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[var(--line)] tw:bg-cali-input tw:p-2.5 tw:text-inherit';

export function ProposalSendDrawer({
  service, protocol, recipient, email, fileName, archivedVersion, sendingAgain, sending,
  file, note, sentMessage, error, onClose, onFile, onNote, onSend,
}: ProposalSendDrawerProps) {
  const title = sendingAgain ? 'Reenviar proposta' : 'Enviar proposta';

  return createPortal(
    <div
      className="portal-send-backdrop tw:fixed tw:inset-0 tw:z-2147483000 tw:bg-[#28191c57] tw:backdrop-blur-[0.125rem]
        tw:[html:has(&)]:overflow-hidden! tw:[body:has(&)]:overflow-hidden! tw:print:hidden!"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <DialogFrame
        as="aside"
        className="portal-send-drawer tw:absolute tw:inset-y-0 tw:right-0 tw:flex tw:w-[min(38.75rem,95vw)] tw:flex-col
          tw:bg-cali-surface tw:font-cali-body tw:text-[0.8125rem] tw:text-cali-text tw:shadow-[-1.125rem_0_3.4375rem_#28161a2e]"
        aria-label={title}
      >
        <header className="tw:flex tw:shrink-0 tw:justify-between tw:gap-4 tw:bg-cali-brand tw:px-[1.625rem] tw:py-6 tw:text-white tw:max-[40rem]:px-5 tw:max-[40rem]:py-4">
          <div>
            <span className="tw:text-xs/[1.4] tw:font-bold tw:tracking-[0.14em] tw:text-[#ddbb7f]">ENVIO APROVADO</span>
            <h2 className="tw:my-1 tw:font-cali-body tw:text-[1.6875rem]/[1.22]! tw:text-white!">{title}</h2>
            <p className="tw:m-0 tw:text-cali-small/[1.55]! tw:text-[#ead9d1]">{service} · {protocol}</p>
          </div>
          <button
            type="button"
            className="tw:grid tw:size-11 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-xl tw:border tw:border-solid
              tw:border-[#5a1e2d1a] tw:bg-white/72 tw:text-cali-ink tw:hover:bg-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold
              tw:workspace-night:border-cali-line tw:workspace-night:bg-[#241b1f] tw:workspace-night:text-cali-text tw:workspace-night:hover:bg-[#2c2126]"
            data-dialog-close=""
            aria-label="Fechar envio da proposta"
            onClick={onClose}
          >
            <X />
          </button>
        </header>

        <div className="portal-send-scroll tw:min-h-0 tw:flex-1 tw:overflow-auto tw:overscroll-contain tw:p-5">
          <section className={sectionStyle}>
            <h3 className={headingStyle}>{archivedVersion ? '1. PDF oficial' : '1. Salve o PDF'}</h3>
            <p className={copyStyle}>{archivedVersion ? `O envio usa o PDF arquivado da versão ${archivedVersion}.` : <>Use “Salvar PDF”. O nome sugerido é <strong>{fileName}</strong>.</>}</p>
          </section>
          <section className={sectionStyle}>
            <h3 className={headingStyle}>2. Confirme o destinatário</h3>
            <p className={copyStyle}><strong>{recipient}</strong> · {email}</p>
            <p className={copyStyle}>Para mudar o destinatário, atualize o contato no briefing.</p>
          </section>
          <section className={sectionStyle}>
            <h3 className={headingStyle}>{archivedVersion ? '3. Confirme o envio' : '3. Anexe e envie'}</h3>
            {!archivedVersion && (
              <label className="tw:my-3 tw:block tw:text-cali-small tw:font-bold">
                Proposta final em PDF
                <input className={fieldStyle} type="file" accept="application/pdf,.pdf" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
              </label>
            )}
            <label className="tw:my-3 tw:block tw:text-cali-small tw:font-bold">
              Mensagem pessoal adicional
              <textarea className={fieldStyle} rows={5} value={note} onChange={(event) => onNote(event.target.value)} />
            </label>
            {sentMessage && <InlineNotice>{sentMessage}</InlineNotice>}
            {error && <InlineNotice tone="danger">{error}</InlineNotice>}
          </section>
        </div>

        <footer className="tw:shrink-0 tw:border-0 tw:border-t tw:border-solid tw:border-[var(--line)] tw:px-5 tw:py-3.5">
          <DocumentAction className="tw:w-full" variant="primary" disabled={(!archivedVersion && !file) || sending || !email.includes('@')} onClick={onSend}>
            {sending ? 'Enviando…' : sendingAgain ? 'Confirmar e reenviar' : 'Confirmar e enviar'}
          </DocumentAction>
        </footer>
      </DialogFrame>
    </div>,
    document.body,
  );
}
