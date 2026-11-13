import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { errorMessage } from '../../../lib/errorMessage';
import { SchedulingAction } from './SchedulingAction';
import { useSubmitSchedulingDialog } from './useSubmitSchedulingDialog';

type Props = {
  title: string;
  section: string;
  submitLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  submitDisabled?: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
  children: ReactNode;
};

export function SchedulingDialog({
  title, section, submitLabel, cancelLabel = 'Cancelar', tone = 'primary', submitDisabled, onClose, onSubmit, children,
}: Props) {
  const titleId = useId();
  const { submit, isPending, error } = useSubmitSchedulingDialog(onSubmit, onClose);

  return createPortal(
    <div className="
      tw:fixed tw:inset-0 tw:z-10050 tw:grid tw:place-items-center tw:bg-[#140d109e] tw:p-7 tw:backdrop-blur-xs
      tw:[@media(max-width:35rem)]:p-2.5
    ">
      <DialogFrame
        aria-labelledby={titleId}
        className="
          tw:max-h-[90vh] tw:w-[min(58rem,96vw)] tw:overflow-auto tw:rounded-3xl tw:border tw:border-solid
          tw:border-cali-line tw:bg-cali-surface tw:text-cali-text tw:shadow-[0_2.25rem_6rem_#00000047]
          tw:workspace-night:border-[#4b373e] tw:workspace-night:bg-[#241a1e] tw:workspace-night:text-[#f2e8ea]
          tw:[@media(max-width:35rem)]:max-h-[96vh] tw:[@media(max-width:35rem)]:w-full
          tw:[@media(max-width:35rem)]:rounded-2xl
        "
      >
        <header className="
          tw:flex tw:items-start tw:justify-between tw:gap-4.5 tw:border-b tw:border-solid tw:border-cali-line
          tw:px-7 tw:pt-6 tw:pb-4.5 tw:[@media(max-width:35rem)]:px-4.5
        ">
          <div>
            <small className="tw:block tw:text-[0.6875rem] tw:font-black tw:tracking-[.13em] tw:text-cali-gold tw:uppercase">{section}</small>
            <h2 id={titleId} className="tw:mt-1 tw:mb-0 tw:text-2xl/[inherit]">{title}</h2>
          </div>
          <SchedulingAction aria-label="Fechar" disabled={isPending} onClick={onClose} className="tw:grid tw:size-11 tw:shrink-0 tw:place-items-center tw:p-0">
            <X size={16} aria-hidden="true" />
          </SchedulingAction>
        </header>
        <form onSubmit={submit} aria-busy={isPending} className="tw:px-7 tw:pt-5.5 tw:pb-7 tw:[@media(max-width:35rem)]:px-4.5">
          <fieldset disabled={isPending} className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0">
            {children}
            {error && <p role="alert" className="tw:mt-3.5 tw:rounded-xl tw:bg-[#fff1f3] tw:px-3.5 tw:py-3 tw:text-sm/[inherit] tw:text-[#8b3246]">
              {errorMessage(error, 'Não foi possível concluir a ação.')}
            </p>}
            <footer className="tw:mt-5.5 tw:flex tw:justify-end tw:gap-2.5">
              <SchedulingAction onClick={onClose}>{cancelLabel}</SchedulingAction>
              <SchedulingAction type="submit" tone={tone} disabled={submitDisabled}>{submitLabel}</SchedulingAction>
            </footer>
          </fieldset>
        </form>
      </DialogFrame>
    </div>,
    document.body,
  );
}
