import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DialogForm } from '../../../../components/ds/DialogForm';

type Props = {
  title: string;
  kicker: string;
  action: string;
  cancelLabel?: string;
  pending: boolean;
  error?: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
};

export function ClientScheduleDialog({ title, kicker, action, cancelLabel = 'Cancelar', pending, error, children, onClose, onSubmit }: Props) {
  return createPortal(<div
    className="tw:fixed tw:inset-0 tw:z-14000 tw:grid tw:place-items-center tw:bg-[#20141873] tw:p-4 tw:backdrop-blur-xs tw:workspace-night:bg-[#0a0809ab] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]"
    onClick={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}
  >
    <DialogForm aria-label={title} aria-busy={pending || undefined}
      className="tw:flex tw:max-h-[calc(100dvh-2rem)] tw:w-full tw:max-w-[42.5rem] tw:flex-col tw:overflow-hidden tw:rounded-2xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:shadow-[0_1.5rem_6rem_#28172440] tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]"
      onSubmit={(event) => { event.preventDefault(); if (!pending) onSubmit(); }}>
      <header className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:bg-[linear-gradient(90deg,#fffaf6,#f8ecd9)] tw:px-7 tw:pt-5 tw:pb-4 tw:workspace-night:bg-[linear-gradient(90deg,#302025,#423026)] tw:max-sm:px-4">
        <div>
          <span className="tw:text-[.6875rem] tw:font-extrabold tw:tracking-[.12em] tw:text-[#8a694f] tw:uppercase tw:workspace-night:text-[#e3c5a6]">{kicker}</span>
          <h2 className="tw:mt-1.5 tw:mb-0 tw:text-xl tw:font-bold tw:tracking-tight">{title}</h2>
        </div>
        <button type="button" aria-label="Fechar" data-dialog-close="" onClick={onClose} disabled={pending}
          className="tw:grid tw:size-8 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:text-lg tw:leading-none tw:text-cali-text tw:disabled:cursor-not-allowed tw:disabled:opacity-50">×</button>
      </header>
      <fieldset disabled={pending} className="tw:m-0 tw:flex tw:min-h-0 tw:min-w-0 tw:flex-col tw:gap-3 tw:overflow-y-auto tw:border-0 tw:px-7 tw:py-5 tw:max-sm:px-4 tw:[&_label]:grid tw:[&_label]:gap-1.5 tw:[&_label]:text-xs tw:[&_label]:font-bold tw:[&_:is(select,input,textarea)]:min-h-10 tw:[&_:is(select,input,textarea)]:w-full tw:[&_:is(select,input,textarea)]:rounded-lg tw:[&_:is(select,input,textarea)]:border tw:[&_:is(select,input,textarea)]:border-solid tw:[&_:is(select,input,textarea)]:border-cali-input-line tw:[&_:is(select,input,textarea)]:bg-cali-input tw:[&_:is(select,input,textarea)]:px-3 tw:[&_:is(select,input,textarea)]:py-2 tw:[&_:is(select,input,textarea)]:text-xs tw:[&_:is(select,input,textarea)]:font-normal tw:[&_:is(select,input,textarea)]:text-cali-text tw:[&_:is(select,input,textarea)]:focus-visible:outline-cali-accent tw:[&_textarea]:resize-y">
        {children}
        {error && <p role="alert" className="tw:m-0 tw:rounded-lg tw:border tw:border-solid tw:border-cali-danger/25 tw:bg-cali-danger/5 tw:p-3 tw:text-xs tw:font-semibold tw:text-cali-danger">{error}</p>}
      </fieldset>
      <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:px-7 tw:py-3.5 tw:max-sm:px-4 tw:[&_button]:cursor-pointer tw:[&_button]:rounded-lg tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:px-3.5 tw:[&_button]:py-2.5 tw:[&_button]:text-xs tw:[&_button]:font-bold tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-50">
        <button type="button" className="tw:border-cali-line tw:bg-cali-surface tw:text-cali-accent" disabled={pending} onClick={onClose}>{cancelLabel}</button>
        <button type="submit" className="tw:border-cali-brand tw:bg-cali-brand tw:text-white" disabled={pending}>{pending ? 'Salvando…' : action}</button>
      </footer>
    </DialogForm>
  </div>, document.body);
}
