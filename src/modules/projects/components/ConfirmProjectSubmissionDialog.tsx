import { createPortal } from 'react-dom';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { DialogForm } from '../../../components/ds/DialogForm';

type Props = {
  kind: 'project' | 'deliverable';
  pending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmProjectSubmissionDialog({ kind, pending, error, onClose, onConfirm }: Props) {
  const project = kind === 'project';
  const action = 'tw:cursor-pointer tw:rounded-[.8462rem] tw:border tw:border-solid tw:px-5 tw:py-3.5 tw:font-[800] tw:focus-visible:outline-2 tw:focus-visible:outline-cali-accent tw:disabled:cursor-not-allowed tw:disabled:opacity-45';

  return createPortal(<div className="tw:fixed tw:inset-0 tw:z-30000 tw:grid tw:place-items-center tw:bg-cali-burgundy-inverse/48 tw:p-7.5 tw:backdrop-blur-[.3846rem]">
    <DialogForm aria-label="Confirmar envio" aria-busy={pending || undefined}
      className="tw:max-h-[calc(100dvh-3.6923rem)] tw:w-[min(43.0769rem,calc(100vw-2.4615rem))] tw:overflow-auto tw:rounded-[1.6923rem] tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-paper tw:text-[color:var(--cali-color-ink)] tw:shadow-[0_1.8462rem_6.1538rem_rgb(var(--cali-rgb-burgundy-inverse)/0.2)]"
      onSubmit={(event) => { event.preventDefault(); if (!pending) onConfirm(); }}>
      <header className="tw:flex tw:gap-4.5 tw:border-b tw:border-solid tw:border-cali-sand-line tw:px-7.5 tw:pt-7.5 tw:pb-5">
        <div className="tw:grid tw:size-13 tw:flex-none tw:place-items-center tw:rounded-[.9231rem] tw:bg-cali-neutral-soft tw:text-cali-red-strong"><ShieldAlert size={21}/></div>
        <div>
          <h2 className="tw:m-0 tw:mb-2 tw:text-cali-title-lg">{project ? 'Enviar cronograma ao cliente?' : 'Enviar entregável para validação?'}</h2>
          <p className="tw:m-0 tw:leading-[1.45] tw:text-cali-neutral-accent">{project ? 'Esta ação altera o projeto para “Aguardando cliente”.' : 'Esta ação altera o entregável de “Em andamento” para “Aguardando cliente” e registra a mudança no histórico.'}</p>
        </div>
        <button type="button" aria-label="Fechar" data-dialog-close="" disabled={pending} onClick={onClose}
          className="tw:ml-auto tw:grid tw:size-11.5 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-xl tw:border-0 tw:bg-cali-neutral-soft tw:text-cali-brand"><X size={19}/></button>
      </header>
      <div className="tw:grid tw:gap-4.5 tw:px-7.5 tw:py-6">
        <p className="tw:m-0 tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-cali-gold-line tw:bg-cali-gold-surface tw:px-4.5 tw:py-4 tw:text-lg tw:leading-[1.45] tw:text-cali-gold-text">
          <AlertTriangle size={15} className="tw:inline"/> Este comando <strong>não dispara e-mail nem anexa arquivo automaticamente</strong>. Ele apenas muda a etapa/status dentro do Workspace. Confirme somente se é isso que você deseja fazer agora.
        </p>
        {error && <p role="alert" className="tw:m-0 tw:text-cali-danger">{error}</p>}
      </div>
      <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-3 tw:border-t tw:border-solid tw:border-cali-sand-line tw:px-7.5 tw:py-5.5">
        <button type="button" className={`${action} tw:border-cali-neutral-line tw:bg-cali-neutral-surface tw:text-cali-brand`} disabled={pending} onClick={onClose}>Cancelar</button>
        <button type="submit" className={`${action} tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface`} disabled={pending}>{pending ? 'Enviando…' : 'Sim, enviar para validação'}</button>
      </footer>
    </DialogForm>
  </div>, document.body);
}
