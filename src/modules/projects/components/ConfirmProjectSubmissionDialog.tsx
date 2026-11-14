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
  const action = 'tw:cursor-pointer tw:rounded-[.8462rem] tw:border tw:border-solid tw:px-[1.3077rem] tw:py-[.8462rem] tw:font-[800] tw:focus-visible:outline-2 tw:focus-visible:outline-cali-accent tw:disabled:cursor-not-allowed tw:disabled:opacity-45';

  return createPortal(<div className="tw:fixed tw:inset-0 tw:z-30000 tw:grid tw:place-items-center tw:bg-[#2019197a] tw:p-[1.8462rem] tw:backdrop-blur-[.3846rem]">
    <DialogForm aria-label="Confirmar envio" aria-busy={pending || undefined}
      className="tw:max-h-[calc(100dvh-3.6923rem)] tw:w-[min(43.0769rem,calc(100vw-2.4615rem))] tw:overflow-auto tw:rounded-[1.6923rem] tw:border tw:border-solid tw:border-[#e6dbd4] tw:bg-[#fffdfa] tw:text-[color:var(--cali-color-ink)] tw:shadow-[0_1.8462rem_6.1538rem_#23141833]"
      onSubmit={(event) => { event.preventDefault(); if (!pending) onConfirm(); }}>
      <header className="tw:flex tw:gap-[1.0769rem] tw:border-b tw:border-solid tw:border-[#eee4df] tw:px-[1.8462rem] tw:pt-[1.8462rem] tw:pb-[1.2308rem]">
        <div className="tw:grid tw:size-[3.2308rem] tw:flex-none tw:place-items-center tw:rounded-[.9231rem] tw:bg-[#f7eeeb] tw:text-[#6d2035]"><ShieldAlert size={21}/></div>
        <div>
          <h2 className="tw:m-0 tw:mb-[.4615rem] tw:text-[1.6923rem]">{project ? 'Enviar cronograma ao cliente?' : 'Enviar entregável para validação?'}</h2>
          <p className="tw:m-0 tw:leading-[1.45] tw:text-[#756b67]">{project ? 'Esta ação altera o projeto para “Aguardando cliente”.' : 'Esta ação altera o entregável de “Em andamento” para “Aguardando cliente” e registra a mudança no histórico.'}</p>
        </div>
        <button type="button" aria-label="Fechar" data-dialog-close="" disabled={pending} onClick={onClose}
          className="tw:ml-auto tw:grid tw:size-[2.9231rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-[.7692rem] tw:border-0 tw:bg-[#f4efeb] tw:text-cali-brand"><X size={19}/></button>
      </header>
      <div className="tw:grid tw:gap-[1.1538rem] tw:px-[1.8462rem] tw:py-[1.5385rem]">
        <p className="tw:m-0 tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-[#ead6a9] tw:bg-[#fbf5e8] tw:px-[1.0769rem] tw:py-[1rem] tw:text-[1.0769rem] tw:leading-[1.45] tw:text-[#72531c]">
          <AlertTriangle size={15} className="tw:inline"/> Este comando <strong>não dispara e-mail nem anexa arquivo automaticamente</strong>. Ele apenas muda a etapa/status dentro do Workspace. Confirme somente se é isso que você deseja fazer agora.
        </p>
        {error && <p role="alert" className="tw:m-0 tw:text-cali-danger">{error}</p>}
      </div>
      <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-[.7692rem] tw:border-t tw:border-solid tw:border-[#eee4df] tw:px-[1.8462rem] tw:py-[1.3846rem]">
        <button type="button" className={`${action} tw:border-[#d9cec8] tw:bg-white tw:text-cali-brand`} disabled={pending} onClick={onClose}>Cancelar</button>
        <button type="submit" className={`${action} tw:border-cali-brand tw:bg-cali-brand tw:text-white`} disabled={pending}>{pending ? 'Enviando…' : 'Sim, enviar para validação'}</button>
      </footer>
    </DialogForm>
  </div>, document.body);
}
