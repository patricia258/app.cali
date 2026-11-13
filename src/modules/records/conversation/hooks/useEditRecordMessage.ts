import { useMutation } from '@tanstack/react-query';
import { editRecordMessage } from '../../../../api/records/conversation';

export function useEditRecordMessage(messageId: string) {
  return useMutation({
    gcTime: 0,
    mutationFn: async (body: string) => {
      const { error } = await editRecordMessage(messageId, body);
      if (error) throw new Error(`Não foi possível editar a mensagem. ${error.message}`);
    },
  });
}
