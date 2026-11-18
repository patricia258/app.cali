import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { submitReportQuestion } from '../../../../api/client/reports/library';

export function useReportQuestionForm(reportId: string, onSent: (protocol: string | null) => void) {
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

  return { form, error };
}
