import { FileText, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';

type Props = {
  surface?: 'compact' | 'document';
  label?: string;
  recipient: string;
  recipientLabel?: string;
  description?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  sent: boolean;
  deliveryReady: boolean;
  deliveryError: boolean;
  onRetry: () => void;
  officialPdf?: boolean;
  revision?: number | string | null;
  feedback: string;
  children?: ReactNode;
};

export function PeopleMapSendDialog({
  surface = 'compact', label = 'Confirmar devolutiva', recipient, recipientLabel = 'Destinatário',
  description, file, onFile, onClose, onSend, sending, sent, deliveryReady, deliveryError, onRetry,
  officialPdf, revision, feedback, children,
}: Props) {
  const close = () => { if (!sending) onClose(); };
  const documentLayout = surface === 'document';
  const layer = documentLayout
    ? 'tw:overflow-auto tw:bg-[#1b15188f]! tw:px-[clamp(1rem,3vw,2.625rem)] tw:py-[clamp(1rem,3vh,2rem)] tw:backdrop-blur-[0.875rem] tw:backdrop-saturate-[0.88] tw:max-[45rem]:p-2'
    : 'tw:bg-[#1b15189e]! tw:p-[1.077rem] tw:backdrop-blur-[0.923rem]';
  const panel = documentLayout
    ? 'tw:max-h-[calc(100dvh-3rem)]! tw:w-[min(42.5rem,calc(100vw-2.5rem))]! tw:rounded-[1.25rem]! tw:border-[#5a1e2d1a]! tw:bg-[#fffdf9]! tw:p-7! tw:shadow-[0_30px_90px_#1d14173d]! tw:max-[45rem]:max-h-[calc(100dvh-1rem)]! tw:max-[45rem]:w-[calc(100vw-1rem)]! tw:max-[45rem]:rounded-2xl! tw:max-[45rem]:px-[1.125rem]! tw:max-[45rem]:py-[1.375rem]!'
    : 'tw:flex tw:max-h-[calc(100dvh-3.692rem)]! tw:w-[min(40rem,calc(100vw-2.154rem))]! tw:flex-col tw:gap-[0.923rem] tw:rounded-[1.077rem]! tw:border-[#eadfd6]! tw:bg-[#fffdfb]! tw:p-8! tw:shadow-[0_20px_80px_#1d111344]! tw:max-[45rem]:px-[1.385rem]! tw:max-[45rem]:pt-[1.846rem]! tw:max-[45rem]:pb-[1.385rem]!';
  const closeButton = documentLayout
    ? 'tw:top-[1.125rem] tw:right-[1.125rem] tw:size-10 tw:rounded-[0.6875rem] tw:border-0 tw:bg-[#f0e9e2]! tw:workspace-night:bg-[#2d2227]!'
    : 'tw:top-[1.231rem] tw:right-[1.231rem] tw:size-[2.462rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white';
  const recipientCard = documentLayout
    ? 'tw:mb-[0.9375rem] tw:gap-[0.3125rem] tw:rounded-[0.8125rem] tw:px-4 tw:py-3.5'
    : 'tw:mb-[1.077rem] tw:gap-[0.385rem] tw:rounded-[1rem] tw:px-[1.231rem] tw:py-[1.077rem]';
  const upload = documentLayout
    ? 'tw:mt-1 tw:min-h-[9.375rem] tw:gap-[0.3125rem] tw:rounded-[0.9375rem] tw:p-5'
    : 'tw:min-h-[11.538rem] tw:gap-[0.385rem] tw:rounded-[1.154rem] tw:p-[1.538rem]';
  const selected = file
    ? 'tw:border-solid tw:border-[#b7d6c0] tw:bg-[#eef7f0] tw:text-[#3d7452] tw:workspace-night:border-[#42634d] tw:workspace-night:bg-[#213027] tw:workspace-night:text-[#9ed0ad]'
    : 'tw:border-dashed tw:border-[#5a1e2d47] tw:bg-white/58 tw:text-cali-brand tw:hover:border-[#5a1e2d75] tw:hover:bg-white/82 tw:workspace-night:border-[#f7f3ee24] tw:workspace-night:bg-[#291e22]';
  const footer = documentLayout
    ? 'tw:mt-[1.125rem] tw:items-center tw:gap-[0.5625rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#5a1e2d17] tw:pt-3.5 tw:max-[45rem]:sticky tw:max-[45rem]:bottom-[-1.375rem] tw:max-[45rem]:mx-[-1.125rem] tw:max-[45rem]:bg-inherit tw:max-[45rem]:px-[1.125rem] tw:max-[45rem]:py-3'
    : 'tw:gap-[0.615rem] tw:border-0! tw:bg-transparent! tw:p-0! tw:max-[45rem]:flex-col-reverse';
  const documentAction = 'tw:inline-flex tw:min-h-[2.625rem]! tw:items-center tw:justify-center tw:rounded-cali-control tw:text-sm/[inherit]! tw:font-bold tw:[transition:background_.18s_ease,transform_.16s_ease] tw:motion-reduce:transition-none';
  const documentPrimary = `${documentAction} tw:border-0 tw:bg-cali-brand tw:px-[1.1875rem] tw:text-white tw:shadow-[0_0.5rem_1.125rem_#5a1e2d2b] tw:hover:-translate-y-px tw:hover:bg-[#481724] tw:workspace-night:bg-[#6a253a] tw:workspace-night:hover:bg-[#7a2d44]`;
  const documentSecondary = `${documentAction} tw:border tw:border-solid tw:border-[#cfbfc1] tw:bg-[var(--paper)] tw:px-[1.125rem] tw:text-[var(--burgundy)] tw:hover:bg-[#faf5f2] tw:workspace-night:border-cali-line tw:workspace-night:bg-[#241b1f] tw:workspace-night:text-cali-text tw:workspace-night:shadow-[0_0.4375rem_1.25rem_#00000021] tw:workspace-night:hover:bg-[#2c2126]`;
  const compactAction = 'tw:inline-flex tw:min-h-[3.231rem] tw:items-center tw:justify-center tw:rounded-[0.538rem]! tw:border tw:border-solid tw:px-[1.077rem]! tw:py-[0.769rem]! tw:text-[0.846rem]/[1.2]! tw:font-bold tw:shadow-none! tw:disabled:cursor-not-allowed tw:disabled:opacity-45 tw:max-[45rem]:w-full';

  return (
    <div className={`workspace-modal-layer tw:fixed tw:inset-0 tw:z-2147483600 tw:grid tw:place-items-center ${layer}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <DialogFrame
        className={`workspace-standard-modal tw:relative tw:m-auto! tw:max-w-none! tw:overflow-x-hidden tw:overflow-y-auto tw:border tw:border-solid tw:font-cali-body tw:workspace-night:border-[#49373e]! tw:workspace-night:bg-[#21191d]! tw:workspace-night:text-cali-day-canvas ${panel}`}
        aria-label={label}
      >
        <button
          className={`tw:absolute tw:grid tw:cursor-pointer tw:place-items-center tw:p-0 tw:text-cali-brand tw:disabled:cursor-wait tw:disabled:opacity-45 tw:workspace-night:text-[#f0ccd5] ${closeButton}`}
          type="button"
          onClick={close}
          disabled={sending}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        <span className={documentLayout ? 'eyebrow tw:mb-2 tw:block tw:text-cali-caption/[1.4]! tw:font-bold tw:tracking-[0.14em] tw:text-[var(--burgundy)]' : 'tw:block tw:text-[0.692rem]/[inherit] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold'}>
          ENVIO DO RELATÓRIO
        </span>
        <h2 className={`tw:text-cali-brand tw:workspace-night:text-cali-day-canvas ${documentLayout ? 'tw:mt-0! tw:mr-13! tw:mb-2! tw:text-[1.65rem]/[inherit]!' : 'tw:m-0! tw:text-[1.615rem]/[inherit]!'}`}>
          Confirmar devolutiva
        </h2>
        {description && <p className="tw:m-0 tw:max-w-[35.385rem] tw:text-[0.923rem]/[1.6] tw:text-[#89796f] tw:workspace-night:text-[#c5b9bb]">{description}</p>}
        <div className={`tw:grid tw:border tw:border-solid tw:border-[#5a1e2d1a] tw:bg-white tw:workspace-night:border-[#f7f3ee24] tw:workspace-night:bg-[#291e22] ${recipientCard}`}>
          <span className={`tw:font-extrabold tw:tracking-[0.08em] tw:text-[#9b8e91] tw:uppercase ${documentLayout ? 'tw:text-[0.625rem]/[inherit]' : 'tw:text-[0.769rem]/[inherit]'}`}>{recipientLabel}</span>
          <strong className={`tw:text-[#4e4245] tw:[overflow-wrap:anywhere] tw:workspace-night:text-cali-day-canvas ${documentLayout ? 'tw:text-[0.8125rem]/[inherit]' : 'tw:text-base/[inherit]'}`}>{recipient}</strong>
        </div>
        {children}
        {deliveryError && <div role="alert">Não foi possível consultar a revisão. <Button type="button" variant={documentLayout ? "unstyled" : "secondary"} className={documentLayout ? documentSecondary : undefined} onClick={onRetry}>Tentar novamente</Button></div>}
        {!deliveryError && !deliveryReady && <p role="status">Consultando revisão…</p>}
        {deliveryReady && officialPdf && <p>O envio usa o PDF oficial da versão {revision}.</p>}
        {deliveryReady && !officialPdf && (
          <label className={`tw:grid tw:cursor-pointer tw:place-items-center tw:border tw:text-center tw:transition-colors tw:duration-150 tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold tw:motion-reduce:transition-none ${upload} ${selected}`}>
            <input className="tw:sr-only" type="file" accept="application/pdf,.pdf" disabled={sending} onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
            <FileText size={22} />
            <strong className={documentLayout ? 'tw:text-[0.8125rem]/[inherit]' : 'tw:text-base/[inherit]'}>{file?.name || 'Selecionar relatório aprovado'}</strong>
            <span className={`${documentLayout ? 'tw:text-[0.6875rem]/[inherit]' : 'tw:text-[0.846rem]/[inherit]'} ${file ? 'tw:text-[#5f8069] tw:workspace-night:text-[#8eb79a]' : 'tw:text-[#94878a]'}`}>
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB${documentLayout ? ' · pronto para enviar' : ''}` : 'PDF de até 8 MB'}
            </span>
          </label>
        )}
        {feedback && <div className="tw:mt-3 tw:rounded-lg tw:bg-[#5a1e2d0f] tw:px-3 tw:py-2.5 tw:text-xs/[inherit] tw:text-[#6b4d56]" aria-live="polite">{feedback}</div>}
        <footer className={`tw:flex tw:justify-end ${footer}`}>
          <Button variant={documentLayout ? "unstyled" : "secondary"} type="button" className={documentLayout ? documentSecondary : `${compactAction} tw:border-[#dec9c3]! tw:bg-white! tw:text-cali-brand!`} onClick={close} disabled={sending}>Cancelar</Button>
          <Button
            variant={documentLayout ? "unstyled" : "primary"}
            type="button"
            className={documentLayout ? documentPrimary : `${compactAction} tw:border-cali-brand! tw:bg-cali-brand! tw:text-white!`}
            onClick={onSend}
            disabled={sending || !deliveryReady || (!officialPdf && !file)}
          >
            {sending ? 'Enviando…' : sent ? 'Reenviar relatório' : 'Enviar relatório'}
          </Button>
        </footer>
      </DialogFrame>
    </div>
  );
}
