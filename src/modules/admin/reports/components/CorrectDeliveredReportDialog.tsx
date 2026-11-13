import { useState } from 'react';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import type { WithdrawableReport } from '../../../../api/reports/withdrawal';
import { useCorrectDeliveredReport } from '../hooks/useCorrectDeliveredReport';

export function CorrectDeliveredReportDialog({ report, onClose, onCorrected }: {
  report: WithdrawableReport;
  onClose: () => void;
  onCorrected: (revisionId: string | null) => void;
}) {
  const [reason, setReason] = useState('');
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [validation, setValidation] = useState('');
  const { mutate, variables, isPending, error } = useCorrectDeliveredReport(report.id, onCorrected);
  const canWithdraw = Number(report.client_open_count || 0) === 0 && !report.client_first_opened_at && !report.acknowledged_at;

  function submit(action: 'edit' | 'remove') {
    const cleanReason = reason.replace(/\s+/g, ' ').trim();
    if (cleanReason.length < 3) {
      setValidation('Informe o motivo da correção.');
      return;
    }
    setValidation('');
    mutate({ action, reason: cleanReason, acknowledgement });
  }

  return (
    <div className="modal-backdrop full-screen-modal" onPointerDown={(event) => {
      if (event.target === event.currentTarget && !isPending) onClose();
    }}>
      <DialogFrame aria-label="Corrigir fechamento" className="modal-card tw:w-[min(35rem,calc(100vw-2rem))]!">
        <Button variant="close" type="button" disabled={isPending} onClick={onClose}>×</Button>
        <span className="section-kicker">CORREÇÃO DE RELATÓRIO</span>
        <h2>Corrigir fechamento</h2>
        <p className="tw:mt-3 tw:mb-4 tw:leading-relaxed tw:text-cali-muted">A versão enviada sai da área do cliente até a próxima liberação. O conteúdo e a ciência anterior ficam no histórico da CALI.</p>
        <div className="tw:mb-4 tw:grid tw:gap-1 tw:rounded-xl tw:border tw:border-solid tw:border-cali-gold/40 tw:bg-cali-gold/10 tw:px-4 tw:py-3">
          <strong className="tw:text-xs tw:tracking-wider tw:text-[#8a693b] tw:uppercase">Importante</strong>
          <span className="tw:leading-normal tw:text-cali-muted">O cliente recebe a nova revisão após aprovação e envio.</span>
        </div>
        {(validation || error) && <InlineNotice>{validation || error?.message}</InlineNotice>}
        <label className="tw:grid tw:gap-2 tw:font-bold">
          Motivo
          <textarea
            rows={3}
            maxLength={500}
            value={reason}
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
            className="tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-input tw:p-3 tw:font-normal"
          />
        </label>
        <label className="tw:mt-3 tw:flex tw:items-center tw:gap-2">
          <input type="checkbox" checked={acknowledgement} disabled={isPending} onChange={(event) => setAcknowledgement(event.target.checked)} />
          Solicitar nova ciência ao cliente
        </label>
        <div className="modal-actions">
          <Button variant="secondary" type="button" disabled={isPending} onClick={onClose}>Cancelar</Button>
          {canWithdraw && <Button variant="secondary" type="button" disabled={isPending} className="tw:text-cali-danger!" onClick={() => submit('remove')}>
            {isPending && variables?.action === 'remove' ? 'Retirando…' : 'Retirar sem substituir'}
          </Button>}
          <Button variant="primary" type="button" disabled={isPending} onClick={() => submit('edit')}>
            {isPending && variables?.action === 'edit' ? 'Preparando edição…' : 'Editar e reenviar'}
          </Button>
        </div>
      </DialogFrame>
    </div>
  );
}
