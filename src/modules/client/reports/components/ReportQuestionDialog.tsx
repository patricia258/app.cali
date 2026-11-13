import { WorkflowDialogOverlay, WorkflowDialog, WorkflowDialogHeader, WorkflowDialogActions } from '../../../../components/ds/WorkflowDialog';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { X } from 'lucide-react';
import { submitReportQuestion } from '../../../../api/client/reports/library';
import { Button } from '../../../../components/ds/Button';
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
    {(sending) => <WorkflowDialogOverlay  role="presentation" onPointerDown={(event) => {
      if (event.currentTarget === event.target && !sending) onClose();
    }}>
      <WorkflowDialog className="tw:relative tw:box-border tw:w-[min(43.077rem,94vw)]! tw:max-w-[43.077rem] tw:rounded-[1.077rem]! tw:border tw:border-solid tw:border-[#e3d8d1] tw:bg-[#fffdfa]! tw:p-[1.846rem]! tw:font-cali-body tw:text-cali-ink tw:shadow-[0_1.846rem_5.385rem_#27181c38]!" aria-label="Enviar uma dúvida">
        <WorkflowDialogHeader>
          <span>SOBRE ESTE RELATÓRIO</span>
          <Button variant="close" className="tw:absolute tw:top-[1.077rem] tw:right-[1.077rem] tw:size-[2.462rem]! tw:cursor-pointer tw:rounded-[0.615rem]! tw:border-0! tw:bg-[#f4efeb]! tw:text-[#4c403b]!" type="button" onClick={onClose} disabled={sending} aria-label="Fechar"><X size={20} /></Button>
        </WorkflowDialogHeader>
        <h2 className="tw:mx-0! tw:mt-[0.462rem]! tw:mb-[0.615rem]! tw:text-[1.385rem]! tw:text-[#2b2024]!">Enviar uma dúvida</h2>
        <p className="tw:m-0! tw:text-[1rem]/[1.55]! tw:text-[#746861]!">A mensagem fica vinculada ao relatório e aparece em Ocorrências.</p>
        <form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
          <form.Field name="message">
            {(field) => <label className="tw:mt-[1.077rem] tw:grid tw:gap-[0.538rem]"><span className="tw:text-[0.923rem] tw:font-semibold tw:text-[#655951]">Mensagem</span>
              <textarea className="tw:box-border tw:min-h-40 tw:w-full tw:resize-y tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#dfd4cd] tw:bg-white tw:px-[0.923rem] tw:py-[0.846rem] tw:font-cali-body tw:text-[1rem]/[1.55] tw:font-normal tw:text-cali-ink" name={field.name} value={field.state.value} onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)} autoFocus required minLength={4}
                maxLength={4000} aria-describedby="report-question-deadline"
                placeholder="Escreva sua dúvida ou observação..." />
            </label>}
          </form.Field>
          <p id="report-question-deadline" className="tw:mt-[0.615rem]! tw:text-[0.923rem]! tw:text-[#8a7a80]!">
            Prazo para envio: até {formatReportQuestionDeadline(deadline)} · 3 dias úteis após a primeira abertura.
          </p>
          {error && <InlineNotice tone="danger" role="alert">{error}</InlineNotice>}
          <WorkflowDialogActions>
            <Button variant="workflowOutline" type="button" disabled={sending} onClick={onClose}>Cancelar</Button>
            <Button variant="workflowPrimary" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar dúvida'}</Button>
          </WorkflowDialogActions>
        </form>
      </WorkflowDialog>
    </WorkflowDialogOverlay>}
  </form.Subscribe>;
}
