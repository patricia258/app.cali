import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeDeliverableConversation } from '../../../../api/projects/conversation';

export function useRefreshDeliverableConversation(actorId: string | undefined, companyId: string, deliverableId: string) {
  const client = useQueryClient();
  const [arrivingId, setArrivingId] = useState<string>();
  useEffect(() => {
    if (!actorId) return;
    return subscribeDeliverableConversation(deliverableId, actorId, (arrival) => {
      if (arrival) {
        setArrivingId(arrival);
        window.dispatchEvent(new CustomEvent('cali:workspace-chime'));
      }
      void client.invalidateQueries({ queryKey: ['deliverable-conversation', actorId, companyId, deliverableId] });
    });
  }, [actorId, client, companyId, deliverableId]);
  return arrivingId;
}
