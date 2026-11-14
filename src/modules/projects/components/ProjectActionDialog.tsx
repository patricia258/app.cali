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
  const button = 'tw:cursor-pointer tw:rounded-[.5385rem] tw:border tw:border-solid tw:px-[1.0769rem] tw:py-[.7692rem] tw:text-[.8462rem] tw:font-bold tw:disabled:cursor-not-allowed tw:disabled:opacity-45';
  return createPortal(<div
    className="tw:fixed tw:inset-0 tw:z-985 tw:grid tw:place-items-center tw:bg-[#171017a8] tw:p-[1.3846rem] tw:backdrop-blur-[.3077rem] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]"
    onClick={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}
  >
    <DialogForm aria-label={title} aria-busy={pending || undefined}
      className="tw:flex tw:max-h-[calc(100dvh-2.7692rem)] tw:w-[min(52.3077rem,100%)] tw:flex-col tw:overflow-hidden tw:rounded-[1.2308rem] tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-[#fffdfb] tw:text-[.9231rem] tw:text-[#302b29] tw:shadow-[0_1.8462rem_7.3077rem_#28172440] tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]"
      onSubmit={(event) => { event.preventDefault(); if (action && !pending && !disabled) onSubmit(); }}>
      <header className="tw:flex tw:items-start tw:justify-between tw:gap-[1.2308rem] tw:bg-[linear-gradient(90deg,#fffaf6,#f8ecd9)] tw:px-[2.2308rem] tw:pt-[1.6923rem] tw:pb-[1.2308rem]">
        <div>
          <span className="tw:text-[.7692rem] tw:font-extrabold tw:tracking-[.0923rem] tw:text-[#af8f72] tw:uppercase">{kicker}</span>
          <h2 className="tw:m-0 tw:mt-[.4615rem] tw:text-[1.6154rem] tw:font-bold tw:tracking-[-.0231rem]">{title}</h2>
        </div>
        <button type="button" aria-label="Fechar" data-dialog-close="" disabled={pending} onClick={onClose}
          className="tw:grid tw:size-[2.6154rem] tw:shrink-0 tw:place-items-center tw:rounded-[.6154rem] tw:border tw:border-solid tw:border-[#ecded5] tw:bg-white tw:text-[1.2308rem] tw:leading-none">×</button>
      </header>
      <div className="tw:flex tw:min-h-0 tw:flex-col tw:gap-[1.0769rem] tw:overflow-y-auto tw:px-[2.2308rem] tw:py-[1.5385rem] tw:[scrollbar-width:none]">
        {children}
        {error && <p role="alert" className="tw:m-0 tw:text-cali-danger">{error}</p>}
      </div>
      <footer className="tw:flex tw:justify-end tw:gap-[.7692rem] tw:border-t tw:border-solid tw:border-[#ede3dd] tw:px-[2.2308rem] tw:py-[1.0769rem]">
        <button type="button" className={`${button} tw:border-[#dec9c3] tw:bg-white tw:text-cali-brand`} disabled={pending} onClick={onClose}>{cancelLabel}</button>
        {action && <button type="submit" className={`${button} tw:border-cali-brand tw:bg-cali-brand tw:text-white`} disabled={pending || disabled}>{pending ? pendingLabel : action}</button>}
      </footer>
    </DialogForm>
  </div>, document.body);
}
