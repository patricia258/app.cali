import { projectKeys } from '../../../../api/projects/query-keys';
import { useQuery } from '@tanstack/react-query';
import { readDeliverableConversationCount } from '../../../../api/projects/conversation';

export function useDeliverableConversationCount(actorId: string | undefined, companyId: string, deliverableId: string, enabled: boolean) {
  return useQuery({
    queryKey: projectKeys.conversationCount(actorId, companyId, deliverableId),
    queryFn: ({ signal }) => readDeliverableConversationCount(companyId, deliverableId, signal),
    enabled: enabled && Boolean(actorId),
    gcTime: 0,
  });
}
