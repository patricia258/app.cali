import { useQuery } from '@tanstack/react-query';
import { readDeliverableConversationCount } from '../../../../api/projects/conversation';

export function useDeliverableConversationCount(actorId: string | undefined, companyId: string, deliverableId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['deliverable-conversation', actorId, companyId, deliverableId, 'count'],
    queryFn: ({ signal }) => readDeliverableConversationCount(companyId, deliverableId, signal),
    enabled: enabled && Boolean(actorId),
    gcTime: 0,
  });
}
