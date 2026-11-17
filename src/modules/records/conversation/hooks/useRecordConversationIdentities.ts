import { recordKeys } from '../../../../api/records/query-keys';
import { useQuery } from '@tanstack/react-query';
import { readConversationIdentities, type ConversationIdentity } from '../../../../api/records/conversation';
import { resolveWorkspaceMedia } from '../../../../lib/workspaceMedia';

export function useRecordConversationIdentities(role: 'admin' | 'client', companyId: string, actorId?: string) {
  return useQuery({
    queryKey: recordKeys.conversationIdentities(actorId, companyId, role),
    enabled: Boolean(actorId),
    gcTime: 0,
    queryFn: async ({ signal }) => {
      if (!actorId) return null;
      const people = await readConversationIdentities(role, companyId, actorId, signal);
      signal.throwIfAborted();
      const hydrate = async (identity: ConversationIdentity) => ({
        ...identity,
        avatar_url: await resolveWorkspaceMedia(identity.avatar_url),
      });
      const [viewer, participants, staff] = await Promise.all([
        people.viewer ? hydrate(people.viewer) : null,
        Promise.all(people.participants.map(hydrate)),
        Promise.all(people.staff.map(hydrate)),
      ]);
      signal.throwIfAborted();
      const byId = new Map<string, ConversationIdentity>();
      for (const identity of [viewer, ...participants, ...staff]) {
        if (identity?.id && !byId.has(identity.id)) byId.set(identity.id, identity);
      }
      return {
        byId,
        admin: role === 'admin' ? viewer : participants[0],
        client: role === 'client' ? viewer : participants[0],
      };
    },
  });
}
