import { CheckCircle2, RefreshCw } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../../../../components/ds/Button';

function ApprovalButton({ primary = false, ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'className'> & { primary?: boolean }) {
  return <Button
    {...props}
    type="button"
    variant="unstyled"
    className={`tw:inline-flex tw:min-h-[2.77rem] tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.46rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:px-[1.08rem] tw:text-[.92rem] tw:font-bold tw:disabled:cursor-default tw:disabled:opacity-45 ${primary ? 'tw:border-[#356448] tw:bg-[#356448] tw:text-white' : 'tw:border-[#dfd3ca] tw:bg-white tw:text-cali-brand'}`}
  />;
}

type ClientSubtaskApprovalProps = {
  phase: 'idle' | 'confirming' | 'adjusting';
  adjustments: number;
  adjustmentText: string;
  busy: boolean;
  onAdjustmentTextChange: (value: string) => void;
  onPhaseChange: (phase: ClientSubtaskApprovalProps['phase']) => void;
  onApprove: () => void;
  onRequestAdjustment: () => void;
};

export function ClientSubtaskApproval({
  phase, adjustments, adjustmentText, busy,
  onAdjustmentTextChange, onPhaseChange, onApprove, onRequestAdjustment,
}: ClientSubtaskApprovalProps) {
  return (
    <div className={`tw:mt-[1.23rem] tw:flex tw:flex-wrap tw:justify-between tw:gap-[1.23rem] tw:rounded-[.77rem] tw:border tw:border-l-[.31rem] tw:border-solid tw:border-[#efd58b] tw:border-l-[#d9a514] tw:bg-[#fff9e8] tw:px-[1.23rem] tw:py-[1.08rem] tw:text-[.96rem] tw:text-[#5f4a12] ${phase === 'adjusting' ? 'tw:flex-col tw:items-stretch' : 'tw:items-center'}`}>
      {phase === 'adjusting' ? (
        <label className="tw:flex tw:flex-col tw:gap-[.46rem] tw:font-bold tw:text-cali-ink">
          O que precisa ser ajustado nesta parte?
          <textarea
            rows={3}
            value={adjustmentText}
            onChange={(event) => onAdjustmentTextChange(event.target.value)}
            placeholder="Descreva o ajuste. A CALI recebe o pedido e esta parte volta para produção."
            maxLength={4000}
            className="tw:box-border tw:w-full tw:resize-y tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[.92rem] tw:py-[.77rem] tw:text-[.96rem] tw:leading-[1.45] tw:font-normal"
          />
        </label>
      ) : phase === 'confirming' ? (
        <span>Confirmar a aprovação desta parte? Depois disso ela fica concluída.</span>
      ) : (
        <span><strong>Esta parte aguarda a sua aprovação.</strong>{' '}
          {adjustments >= 2
            ? 'Os 2 ajustes desta parte já foram usados; se precisar, fale com a CALI pela conversa.'
            : `Ajustes usados: ${adjustments} de 2.`}
        </span>
      )}
      <span className={`tw:flex tw:flex-wrap tw:gap-[.62rem] ${phase === 'adjusting' ? 'tw:self-end' : ''}`}>
        {phase !== 'idle' ? (
          <ApprovalButton onClick={() => onPhaseChange('idle')}>Voltar</ApprovalButton>
        ) : adjustments < 2 && (
          <ApprovalButton onClick={() => onPhaseChange('adjusting')}><RefreshCw size={14} /> Pedir ajuste</ApprovalButton>
        )}
        {phase === 'adjusting' ? (
          <ApprovalButton primary disabled={busy || adjustmentText.trim().length < 10} onClick={onRequestAdjustment}>
            {busy ? 'Enviando…' : 'Enviar pedido de ajuste'}
          </ApprovalButton>
        ) : phase === 'confirming' ? (
          <ApprovalButton primary disabled={busy} onClick={onApprove}>
            {busy ? 'Registrando…' : 'Sim, aprovar'}
          </ApprovalButton>
        ) : (
          <ApprovalButton primary onClick={() => onPhaseChange('confirming')}><CheckCircle2 size={14} /> Aprovar esta parte</ApprovalButton>
        )}
      </span>
    </div>
  );
}
