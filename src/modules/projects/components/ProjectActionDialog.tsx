import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DialogForm } from '../../../components/ds/DialogForm';

type Props = {
  title: string;
  kicker: string;
  action?: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
  error?: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
};

export function ProjectActionDialog({ title, kicker, action, cancelLabel = 'Cancelar', pending, pendingLabel = 'Salvando…', disabled, error, children, onClose, onSubmit }: Props) {
  const button = 'tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:px-4.5 tw:py-3 tw:text-sm tw:font-bold tw:disabled:cursor-not-allowed tw:disabled:opacity-45';
  return createPortal(<div
    className="tw:fixed tw:inset-0 tw:z-985 tw:grid tw:place-items-center tw:bg-cali-neutral-inverse/66 tw:p-5.5 tw:backdrop-blur-[.3077rem] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]"
    onClick={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}
  >
    <DialogForm aria-label={title} aria-busy={pending || undefined}
      className="tw:flex tw:max-h-[calc(100dvh-2.7692rem)] tw:w-[min(52.3077rem,100%)] tw:flex-col tw:overflow-hidden tw:rounded-[1.2308rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:text-cali-body tw:text-cali-text tw:shadow-[0_1.8462rem_7.3077rem_rgb(var(--cali-rgb-red-inverse)/0.251)] tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]"
      onSubmit={(event) => { event.preventDefault(); if (action && !pending && !disabled) onSubmit(); }}>
      <header className="tw:flex tw:items-start tw:justify-between tw:gap-5 tw:bg-[linear-gradient(90deg,var(--cali-color-sand-surface),var(--cali-color-orange-surface))] tw:px-9 tw:pt-7 tw:pb-5">
        <div>
          <span className="tw:text-xs tw:font-extrabold tw:tracking-[.0923rem] tw:text-cali-warning tw:uppercase">{kicker}</span>
          <h2 className="tw:m-0 tw:mt-2 tw:text-cali-title tw:font-bold tw:tracking-[-.0231rem]">{title}</h2>
        </div>
        <button type="button" aria-label="Fechar" data-dialog-close="" disabled={pending} onClick={onClose}
          className="tw:grid tw:size-10.5 tw:shrink-0 tw:place-items-center tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:text-xl tw:leading-none">×</button>
      </header>
      <div className="tw:flex tw:min-h-0 tw:flex-col tw:gap-4.5 tw:overflow-y-auto tw:px-9 tw:py-6 tw:[scrollbar-width:none]">
        {children}
        {error && <p role="alert" className="tw:m-0 tw:text-cali-danger">{error}</p>}
      </div>
      <footer className="tw:flex tw:justify-end tw:gap-3 tw:border-t tw:border-solid tw:border-cali-sand-line tw:px-9 tw:py-4.5">
        <button type="button" className={`${button} tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:text-cali-brand`} disabled={pending} onClick={onClose}>{cancelLabel}</button>
        {action && <button type="submit" className={`${button} tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface`} disabled={pending || disabled}>{pending ? pendingLabel : action}</button>}
      </footer>
    </DialogForm>
  </div>, document.body);
}
