import { useQuery } from '@tanstack/react-query';
import { readDeliverableConversationIdentities, type DeliverableConversationIdentity } from '../../../../api/projects/conversation';

export function useDeliverableConversationIdentities(role: 'admin' | 'client', companyId: string, actorId: string | undefined, active: boolean) {
  return useQuery({
    queryKey: ['deliverable-conversation-identities', role, companyId, actorId],
    queryFn: async ({ signal }) => {
      if (!actorId) return null;
      const people = await readDeliverableConversationIdentities(role, companyId, actorId, signal);
      if (signal.aborted) return null;
      const unique = new Map<string, DeliverableConversationIdentity>();
      for (const person of [people.viewer, ...people.staff, ...people.clients, people.contact]) {
        if (person?.id && !unique.has(person.id)) unique.set(person.id, person);
      }
      return {
        identities: unique,
        admin: role === 'admin' ? people.viewer : people.contact,
        client: role === 'client' ? people.viewer : people.clients[0],
      };
    },
    enabled: active && Boolean(actorId),
    staleTime: 60_000,
    gcTime: 0,
  });
}
