import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postAdminDeliverableComment, postClientDeliverableComment } from '../../../../api/projects/conversation';

export function usePostDeliverableComment(role: 'admin' | 'client', companyId: string, deliverableId: string, actorId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['deliverable-conversation', actorId, companyId, deliverableId] }); },
    mutationFn: async ({ body, visible }: { body: string; visible: boolean }) => {
      if (!actorId) throw new Error('Sessão indisponível. Entre novamente para enviar a mensagem.');
      const result = role === 'admin'
        ? await postAdminDeliverableComment(companyId, deliverableId, actorId, body, visible, 'admin')
        : await postClientDeliverableComment(deliverableId, body);
      if (result.error) throw new Error(result.error.message);
    },
  });
}
