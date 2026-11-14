import { X } from 'lucide-react';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';

export type ReportWorkflowAction = 'refresh-facts' | 'refresh-preview' | 'refresh-simulation' | 'create-simulation';

const confirmations = {
  'refresh-facts': {
    title: 'Atualizar os fatos deste fechamento?',
    body: 'Os dados automáticos da versão atual serão atualizados. Sua leitura editorial é preservada e nenhuma nova versão é criada.',
    confirm: 'Atualizar',
  },
  'refresh-preview': {
    title: 'Atualizar esta prévia?',
    body: 'Os dados automáticos serão atualizados e a curadoria que você preparou será preservada.',
    confirm: 'Atualizar',
  },
  'refresh-simulation': {
    title: 'Atualizar esta simulação?',
    body: 'Os dados automáticos serão refeitos com o que existe hoje. Esta simulação permanece interna e não pode ser enviada ao cliente.',
    confirm: 'Atualizar',
  },
  'create-simulation': {
    title: 'Criar uma simulação interna?',
    body: 'A competência já possui um fechamento oficial enviado. A simulação serve para consultar como os dados atuais ficariam. Ela não poderá ser aprovada nem enviada.',
    confirm: 'Criar simulação',
  },
} satisfies Record<ReportWorkflowAction, { title: string; body: string; confirm: string }>;

export function ReportWorkflowConfirmation({ action, onCancel, onConfirm }: {
  action: ReportWorkflowAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { title, body, confirm } = confirmations[action];

  return (
    <div
      className="tw:fixed tw:inset-0 tw:z-[420] tw:grid tw:place-items-center tw:bg-[#140d0f]/50 tw:p-[1.375rem] tw:backdrop-blur-md"
      onPointerDown={(event) => { if (event.currentTarget === event.target) onCancel(); }}
    >
      <DialogFrame
        aria-label={title}
        className="tw:relative tw:box-border tw:w-[min(30rem,94vw)] tw:max-w-full tw:rounded-[0.875rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-6 tw:font-cali-body tw:text-cali-text tw:shadow-[0_1.5rem_4.375rem_rgba(39,24,28,.22)]"
      >
        <Button type="button" variant="close" className="tw:absolute! tw:top-3.5! tw:right-3.5! tw:size-8!" onClick={onCancel}><X size={18} /></Button>
        <span className="tw:mb-1.5 tw:block tw:text-[0.625rem] tw:font-bold tw:tracking-[0.12em] tw:text-cali-gold">CONFIRMAÇÃO</span>
        <h2 className="tw:mt-0 tw:mr-9 tw:mb-2 tw:text-[1.125rem]! tw:leading-tight">{title}</h2>
        <p className="tw:m-0 tw:text-[0.8125rem] tw:leading-[1.55] tw:text-cali-muted">{body}</p>
        <footer className="tw:mt-5 tw:flex tw:flex-wrap tw:justify-end tw:gap-2">
          <Button type="button" variant="secondary" className="tw:min-h-10 tw:px-4" autoFocus onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="primary" className="tw:min-h-10 tw:px-4" onClick={onConfirm}>{confirm}</Button>
        </footer>
      </DialogFrame>
    </div>
  );
}
