import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { X } from 'lucide-react';
import { submitReportQuestion } from '../../../../api/client/reports/library';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../../components/ds/InlineNotice';

type Props = {
  reportId: string;
  deadline: Date;
  onClose: () => void;
  onSent: (protocol: string | null) => void;
};

export const formatReportQuestionDeadline = (date: Date) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(date);

export function ReportQuestionDialog({ reportId, deadline, onClose, onSent }: Props) {
  const [error, setError] = useState('');
  const form = useForm({
    defaultValues: { message: '' },
    onSubmit: async ({ value }) => {
      setError('');
      try {
        const receipt = await submitReportQuestion(reportId, value.message);
        onSent(receipt.record_protocol ?? null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a dúvida.');
      }
    },
  });

  return <form.Subscribe selector={(state) => state.isSubmitting}>
    {(sending) => <div className="wf-overlay" role="presentation" onPointerDown={(event) => {
      if (event.currentTarget === event.target && !sending) onClose();
    }}>
      <DialogFrame className="wf-modal client-report-question-modal-v61" aria-label="Enviar uma dúvida">
        <div className="wf-modal-header">
          <span>SOBRE ESTE RELATÓRIO</span>
          <Button variant="close" type="button" onClick={onClose} disabled={sending} aria-label="Fechar"><X size={20} /></Button>
        </div>
        <h2>Enviar uma dúvida</h2>
        <p>A mensagem fica vinculada ao relatório e aparece em Ocorrências.</p>
        <form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
          <form.Field name="message">
            {(field) => <label><span>Mensagem</span>
              <textarea name={field.name} value={field.state.value} onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)} autoFocus required minLength={4}
                maxLength={4000} aria-describedby="report-question-deadline"
                placeholder="Escreva sua dúvida ou observação..." />
            </label>}
          </form.Field>
          <p id="report-question-deadline" className="client-report-question-deadline-v61">
            Prazo para envio: até {formatReportQuestionDeadline(deadline)} · 3 dias úteis após a primeira abertura.
          </p>
          {error && <InlineNotice tone="danger" role="alert">{error}</InlineNotice>}
          <div className="wf-modal-actions">
            <Button variant="workflowOutline" type="button" disabled={sending} onClick={onClose}>Cancelar</Button>
            <Button variant="workflowPrimary" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar dúvida'}</Button>
          </div>
        </form>
      </DialogFrame>
    </div>}
  </form.Subscribe>;
}
