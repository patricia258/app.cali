import { useMutation } from '@tanstack/react-query';
import { submitRecordFeedback } from '../../../../api/records/closure';

export function useRecordClosureFeedback(recordId: string, onSuccess: () => void) {
  return useMutation({
    mutationFn: async ({ closureId, score, comment }: { closureId: string; score: number; comment: string | null }) => {
      const { error } = await submitRecordFeedback(recordId, closureId, score, comment);
      if (error) throw new Error(error.message || 'Não foi possível registrar sua avaliação.');
    },
    onSuccess,
  });
}
