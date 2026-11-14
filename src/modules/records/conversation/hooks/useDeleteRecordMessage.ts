import { useMutation } from '@tanstack/react-query';
import { deleteRecordMessage } from '../../../../api/records/conversation';

export function useDeleteRecordMessage(messageId: string) {
  return useMutation({
    gcTime: 0,
    mutationFn: async () => {
      const { error } = await deleteRecordMessage(messageId);
      if (error) throw new Error(`Não foi possível excluir a mensagem. ${error.message}`);
    },
  });
}
