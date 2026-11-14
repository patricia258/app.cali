import { useMutation } from '@tanstack/react-query';
import { decideRecordReopen } from '../../../../api/records/closure';

export function useDecideRecordReopen(onSuccess: () => void) {
  return useMutation({
    mutationFn: async ({ requestId, decision, note }: { requestId: string; decision: 'approved' | 'rejected'; note: string | null }) => {
      const { error } = await decideRecordReopen(requestId, decision, note);
      if (error) throw new Error(error.message || 'Não foi possível registrar a decisão.');
    },
    onSuccess,
  });
}
