import { useQuery } from '@tanstack/react-query';
import { readDeliverableConversation } from '../../../../api/projects/conversation';

export function useDeliverableConversationMessages(actorId: string | undefined, companyId: string, deliverableId: string, visible: boolean, active: boolean) {
  return useQuery({
    queryKey: ['deliverable-conversation', actorId, companyId, deliverableId, visible],
    queryFn: ({ signal }) => readDeliverableConversation(companyId, deliverableId, visible, signal),
    enabled: active && Boolean(actorId),
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
