import { useMutation } from '@tanstack/react-query';
import { requestRecordReopen } from '../../../../api/records/closure';

export function useRequestRecordReopen(recordId: string, onSuccess: () => void) {
  return useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await requestRecordReopen(recordId, reason);
      if (error) throw new Error(error.message || 'Não foi possível solicitar a reabertura.');
    },
    onSuccess,
  });
}
