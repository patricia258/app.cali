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
    ? 'tw:overflow-auto tw:bg-cali-neutral-inverse/56! tw:px-[clamp(1rem,3vw,2.625rem)] tw:py-[clamp(1rem,3vh,2rem)] tw:backdrop-blur-[0.875rem] tw:backdrop-saturate-[0.88] tw:max-[45rem]:p-2'
    : 'tw:bg-cali-neutral-inverse/62! tw:p-4.5 tw:backdrop-blur-[0.923rem]';
  const panel = documentLayout
    ? 'tw:max-h-[calc(100dvh-3rem)]! tw:w-[min(42.5rem,calc(100vw-2.5rem))]! tw:rounded-[1.25rem]! tw:border-cali-brand/10! tw:bg-cali-paper! tw:p-7! tw:shadow-[0_30px_90px_rgb(var(--cali-rgb-neutral-inverse)/0.2392)]! tw:max-[45rem]:max-h-[calc(100dvh-1rem)]! tw:max-[45rem]:w-[calc(100vw-1rem)]! tw:max-[45rem]:rounded-2xl! tw:max-[45rem]:px-4.5! tw:max-[45rem]:py-5.5!'
    : 'tw:flex tw:max-h-[calc(100dvh-3.692rem)]! tw:w-[min(40rem,calc(100vw-2.154rem))]! tw:flex-col tw:gap-3.5 tw:rounded-[1.077rem]! tw:border-cali-line! tw:bg-cali-paper! tw:p-8! tw:shadow-[0_20px_80px_rgb(var(--cali-rgb-neutral-inverse)/0.2667)]! tw:max-[45rem]:px-5.5! tw:max-[45rem]:pt-7.5! tw:max-[45rem]:pb-5.5!';
  const closeButton = documentLayout
    ? 'tw:top-4.5 tw:right-4.5 tw:size-10 tw:rounded-cali-panel tw:border-0 tw:bg-cali-neutral-soft! tw:workspace-night:bg-cali-burgundy-strong!'
    : 'tw:top-5 tw:right-5 tw:size-10 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface';
  const recipientCard = documentLayout
    ? 'tw:mb-4 tw:gap-1 tw:rounded-xl tw:px-4 tw:py-3.5'
    : 'tw:mb-4.5 tw:gap-1.5 tw:rounded-2xl tw:px-5 tw:py-4.5';
  const upload = documentLayout
    ? 'tw:mt-1 tw:min-h-37.5 tw:gap-1 tw:rounded-2xl tw:p-5'
    : 'tw:min-h-[11.538rem] tw:gap-1.5 tw:rounded-[1.154rem] tw:p-6';
  const selected = file
    ? 'tw:border-solid tw:border-cali-green-soft tw:bg-cali-green-surface tw:text-cali-green-accent tw:workspace-night:border-cali-green-text tw:workspace-night:bg-cali-green-inverse tw:workspace-night:text-cali-green-line'
    : 'tw:border-dashed tw:border-cali-brand/28 tw:bg-cali-neutral-surface/58 tw:text-cali-brand tw:hover:border-cali-brand/46 tw:hover:bg-cali-neutral-surface/82 tw:workspace-night:border-cali-sand-soft/14 tw:workspace-night:bg-cali-burgundy-strong';
  const footer = documentLayout
    ? 'tw:mt-4.5 tw:items-center tw:gap-2 tw:border-0 tw:border-t tw:border-solid tw:border-cali-brand/9 tw:pt-3.5 tw:max-[45rem]:sticky tw:max-[45rem]:-bottom-5.5 tw:max-[45rem]:-mx-4.5 tw:max-[45rem]:bg-inherit tw:max-[45rem]:px-4.5 tw:max-[45rem]:py-3'
    : 'tw:gap-2.5 tw:border-0! tw:bg-transparent! tw:p-0! tw:max-[45rem]:flex-col-reverse';
  const documentAction = 'tw:inline-flex tw:min-h-10.5! tw:items-center tw:justify-center tw:rounded-cali-control tw:text-sm/[inherit]! tw:font-bold tw:[transition:background_.18s_ease,transform_.16s_ease] tw:motion-reduce:transition-none';
  const documentPrimary = `${documentAction} tw:border-0 tw:bg-cali-brand tw:px-5 tw:text-cali-neutral-surface tw:shadow-[0_0.5rem_1.125rem_rgb(var(--cali-rgb-burgundy-accent)/0.1686)] tw:hover:-translate-y-px tw:hover:bg-cali-burgundy-text tw:workspace-night:bg-cali-red-strong tw:workspace-night:hover:bg-cali-red-strong`;
  const documentSecondary = `${documentAction} tw:border tw:border-solid tw:border-cali-line-strong tw:bg-[var(--paper)] tw:px-4.5 tw:text-[var(--burgundy)] tw:hover:bg-cali-surface-soft tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface tw:workspace-night:text-cali-text tw:workspace-night:shadow-[0_0.4375rem_1.25rem_rgb(var(--cali-rgb-shadow)/0.1294)] tw:workspace-night:hover:bg-cali-surface-muted`;
  const compactAction = 'tw:inline-flex tw:min-h-[3.231rem] tw:items-center tw:justify-center tw:rounded-lg! tw:border tw:border-solid tw:px-4.5! tw:py-3! tw:text-sm/[1.2]! tw:font-bold tw:shadow-none! tw:disabled:cursor-not-allowed tw:disabled:opacity-45 tw:max-[45rem]:w-full';

  return (
    <div className={`workspace-modal-layer tw:fixed tw:inset-0 tw:z-2147483600 tw:grid tw:place-items-center ${layer}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <DialogFrame
        className={`workspace-standard-modal tw:relative tw:m-auto! tw:max-w-none! tw:overflow-x-hidden tw:overflow-y-auto tw:border tw:border-solid tw:font-cali-body tw:workspace-night:border-cali-line-strong! tw:workspace-night:bg-cali-surface! tw:workspace-night:text-cali-day-canvas ${panel}`}
        aria-label={label}
      >
        <button
          className={`tw:absolute tw:grid tw:cursor-pointer tw:place-items-center tw:p-0 tw:text-cali-brand tw:disabled:cursor-wait tw:disabled:opacity-45 tw:workspace-night:text-cali-red-soft ${closeButton}`}
          type="button"
          onClick={close}
          disabled={sending}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        <span className={documentLayout ? 'eyebrow tw:mb-2 tw:block tw:text-cali-caption/[1.4]! tw:font-bold tw:tracking-[0.14em] tw:text-[var(--burgundy)]' : 'tw:block tw:text-cali-label/[inherit] tw:font-extrabold tw:tracking-[0.14em] tw:text-cali-gold'}>
          ENVIO DO RELATÓRIO
        </span>
        <h2 className={`tw:text-cali-brand tw:workspace-night:text-cali-day-canvas ${documentLayout ? 'tw:mt-0! tw:mr-13! tw:mb-2! tw:text-cali-title/[inherit]!' : 'tw:m-0! tw:text-cali-title/[inherit]!'}`}>
          Confirmar devolutiva
        </h2>
        {description && <p className="tw:m-0 tw:max-w-[35.385rem] tw:text-cali-body/[1.6] tw:text-cali-sand-text tw:workspace-night:text-cali-neutral-line">{description}</p>}
        <div className={`tw:grid tw:border tw:border-solid tw:border-cali-brand/10 tw:bg-cali-neutral-surface tw:workspace-night:border-cali-sand-soft/14 tw:workspace-night:bg-cali-burgundy-strong ${recipientCard}`}>
          <span className={`tw:font-extrabold tw:tracking-[0.08em] tw:text-cali-sand-text tw:uppercase ${documentLayout ? 'tw:text-cali-micro/[inherit]' : 'tw:text-xs/[inherit]'}`}>{recipientLabel}</span>
          <strong className={`tw:text-cali-neutral-text tw:[overflow-wrap:anywhere] tw:workspace-night:text-cali-day-canvas ${documentLayout ? 'tw:text-cali-detail/[inherit]' : 'tw:text-base/[inherit]'}`}>{recipient}</strong>
        </div>
        {children}
        {deliveryError && <div role="alert">Não foi possível consultar a revisão. <Button type="button" variant={documentLayout ? "unstyled" : "secondary"} className={documentLayout ? documentSecondary : undefined} onClick={onRetry}>Tentar novamente</Button></div>}
        {!deliveryError && !deliveryReady && <p role="status">Consultando revisão…</p>}
        {deliveryReady && officialPdf && <p>O envio usa o PDF oficial da versão {revision}.</p>}
        {deliveryReady && !officialPdf && (
          <label className={`tw:grid tw:cursor-pointer tw:place-items-center tw:border tw:text-center tw:transition-colors tw:duration-150 tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold tw:motion-reduce:transition-none ${upload} ${selected}`}>
            <input className="tw:sr-only" type="file" accept="application/pdf,.pdf" disabled={sending} onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
            <FileText size={22} />
            <strong className={documentLayout ? 'tw:text-cali-detail/[inherit]' : 'tw:text-base/[inherit]'}>{file?.name || 'Selecionar relatório aprovado'}</strong>
            <span className={`${documentLayout ? 'tw:text-cali-label/[inherit]' : 'tw:text-sm/[inherit]'} ${file ? 'tw:text-cali-green-accent tw:workspace-night:text-cali-green-line' : 'tw:text-cali-sand-text'}`}>
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB${documentLayout ? ' · pronto para enviar' : ''}` : 'PDF de até 8 MB'}
            </span>
          </label>
        )}
        {feedback && <div className="tw:mt-3 tw:rounded-lg tw:bg-cali-brand/6 tw:px-3 tw:py-2.5 tw:text-xs/[inherit] tw:text-cali-neutral-text" aria-live="polite">{feedback}</div>}
        <footer className={`tw:flex tw:justify-end ${footer}`}>
          <Button variant={documentLayout ? "unstyled" : "secondary"} type="button" className={documentLayout ? documentSecondary : `${compactAction} tw:border-cali-line-strong! tw:bg-cali-neutral-surface! tw:text-cali-brand!`} onClick={close} disabled={sending}>Cancelar</Button>
          <Button
            variant={documentLayout ? "unstyled" : "primary"}
            type="button"
            className={documentLayout ? documentPrimary : `${compactAction} tw:border-cali-brand! tw:bg-cali-brand! tw:text-cali-neutral-surface!`}
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
