import { useMutation } from '@tanstack/react-query';
import { deleteUnopenedRecord } from '../../../api/records/operations';

export function useDeleteUnopenedRecord(recordId: string, onDeleted: () => void) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await deleteUnopenedRecord(recordId);
      if (error) throw new Error(error.message || 'Não foi possível excluir esta solicitação.');
    },
    onSuccess: onDeleted,
  });
}
